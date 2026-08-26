import { NavLink } from 'react-router-dom'
import {
  Home, BarChart2, Receipt, Briefcase,
  Compass, Target, MessageCircle,
} from 'lucide-react'
import styles from './Sidebar.module.css'

const navItems = [
  { to: '/home',          icon: Home,         label: 'Home' },
  { to: '/behavior',      icon: BarChart2,     label: 'Behavior' },
  { to: '/expenses',      icon: Receipt,       label: 'Expenses' },
  { to: '/assets',        icon: Briefcase,     label: 'Wealth' },
  { to: '/opportunities', icon: Compass,       label: 'Opportunities' },
  { to: '/goals',         icon: Target,        label: 'Goals' },
]

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <NavLink to="/home" className={styles.logo}>
        <div className={styles.logoMark}>D</div>
        <span className={styles.logoText}>Dekho</span>
      </NavLink>

      <nav className={styles.nav} aria-label="Sidebar navigation">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [styles.navItem, isActive ? styles.active : ''].filter(Boolean).join(' ')
            }
          >
            <span className={styles.iconWrap}>
              <Icon size={18} strokeWidth={1.75} />
            </span>
            {label}
          </NavLink>
        ))}
      </nav>

      <NavLink to="/ask" className={styles.askCTA}>
        <MessageCircle size={18} strokeWidth={1.75} />
        Ask Dekho
      </NavLink>
    </aside>
  )
}
