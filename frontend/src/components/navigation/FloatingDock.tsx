import { NavLink } from 'react-router-dom'
import {
  Home,
  Receipt,
  PiggyBank,
  Landmark,
  TrendingUp,
} from 'lucide-react'
import styles from './FloatingDock.module.css'

const navItems = [
  { to: '/budgets',  icon: PiggyBank,   label: 'Budgets'  },
  { to: '/expenses', icon: Receipt,     label: 'Expenses' },
  { to: '/home',     icon: Home,        label: 'Home',    center: true },
  { to: '/assets',   icon: Landmark,    label: 'Wealth'   },
  { to: '/grow',     icon: TrendingUp,  label: 'Grow'     },
]

export default function FloatingDock() {
  return (
    <nav className={styles.dock} aria-label="Main navigation">
      <div className={styles.inner}>
        {navItems.map(({ to, icon: Icon, label, center }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [styles.item, center ? styles.center : '', isActive ? styles.active : '']
                .filter(Boolean)
                .join(' ')
            }
            aria-label={label}
          >
            <span className={styles.iconWrap}>
              <Icon size={center ? 22 : 20} strokeWidth={1.75} />
            </span>
            <span className={styles.label}>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
