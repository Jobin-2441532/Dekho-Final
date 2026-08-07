import styles from './GlobalLoader.module.css'

export default function GlobalLoader() {
  return (
    <div className={styles.loaderContainer}>
      <div className={styles.loadRow}>
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
