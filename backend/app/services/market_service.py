"""
Market context — current index levels and news headlines, shown as plain
information with a source and timestamp, never as a prediction or trading
signal (per the Grow section's "what Grow is NOT" ground rules).

Uses free, key-less public sources so no secret ever needs to reach the
frontend: Yahoo Finance's public chart endpoint for index quotes, and the
Economic Times Markets RSS feed for headlines. Cached in-memory with a short
TTL so we're not hammering either source, with a graceful fallback to the
last-known-good snapshot (or an explicit "unavailable" state) if a live
fetch fails.
"""
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import httpx

CACHE_TTL_SECONDS = 600  # 10 minutes

INDICES = [
    {"symbol": "^NSEI", "name": "Nifty 50"},
    {"symbol": "^BSESN", "name": "Sensex"},
]

NEWS_FEED_URL = "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"
NEWS_SOURCE = "The Economic Times"

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; DekhoGrowBot/1.0)"}

DISCLAIMER = (
    "This is current market information for context, not a trading signal or "
    "prediction. Prices move constantly and past movement doesn't indicate what happens next."
)

_cache: dict = {"data": None, "fetched_at": 0.0}


def _fetch_index_quote(client: httpx.Client, symbol: str, name: str) -> dict | None:
    try:
        resp = client.get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
            # 15m/5d gives both the current snapshot (meta) and a reliable trend
            # sparkline in one request — range=1d alone is too sparse once the
            # market's closed for the day (as low as 1-2 points).
            params={"interval": "15m", "range": "5d"},
            headers=HEADERS,
            timeout=5.0,
        )
        resp.raise_for_status()
        result = resp.json()["chart"]["result"][0]
        meta = result["meta"]
        price = meta["regularMarketPrice"]
        prev_close = meta["chartPreviousClose"]
        change = price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0
        as_of = datetime.fromtimestamp(meta["regularMarketTime"], tz=timezone.utc).isoformat()

        closes = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        non_null = [round(c, 2) for c in closes if c is not None]
        # Cap the sparkline payload — a stride sample is plenty for a trend line.
        stride = max(1, len(non_null) // 60)
        series = non_null[::stride]

        return {
            "symbol": symbol,
            "name": name,
            "price": round(price, 2),
            "change": round(change, 2),
            "changePercent": round(change_pct, 2),
            "asOf": as_of,
            "series": series,
        }
    except Exception:
        return None


def _fetch_news(client: httpx.Client, limit: int = 5) -> list[dict]:
    try:
        resp = client.get(NEWS_FEED_URL, headers=HEADERS, timeout=5.0)
        resp.raise_for_status()
        root = ET.fromstring(resp.text)
        items = []
        for item in root.findall("./channel/item")[:limit]:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            pub_date = (item.findtext("pubDate") or "").strip()
            if title:
                items.append({
                    "title": title,
                    "link": link,
                    "source": NEWS_SOURCE,
                    "publishedAt": pub_date,
                })
        return items
    except Exception:
        return []


def _fetch_live() -> dict:
    with httpx.Client() as client:
        indices = [q for q in (_fetch_index_quote(client, i["symbol"], i["name"]) for i in INDICES) if q]
        news = _fetch_news(client)

    return {
        "indices": indices,
        "news": news,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
    }


def get_market_context() -> dict:
    """Cached market snapshot. Falls back to the last-known-good snapshot
    (marked stale) if a live fetch fails or returns nothing usable, so the
    UI always has something sensible to render."""
    now = time.time()
    is_cache_fresh = _cache["data"] is not None and (now - _cache["fetched_at"]) < CACHE_TTL_SECONDS

    if not is_cache_fresh:
        live = _fetch_live()
        if live["indices"] or live["news"]:
            _cache["data"] = live
            _cache["fetched_at"] = now
            is_cache_fresh = True  # just refreshed successfully

    if _cache["data"] is None:
        return {
            "available": False,
            "stale": False,
            "indices": [],
            "news": [],
            "fetchedAt": None,
            "disclaimer": DISCLAIMER,
        }

    return {
        "available": True,
        "stale": not is_cache_fresh,  # serving a last-known-good snapshot; a fresh fetch just failed
        **_cache["data"],
        "disclaimer": DISCLAIMER,
    }
