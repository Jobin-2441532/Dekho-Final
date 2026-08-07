import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import styles from './AddTransactionFAB.module.css'

export default function AddTransactionFAB() {
  const navigate = useNavigate()

  return (
    <div className={styles.wrapper}>
      <motion.button
        className={styles.fab}
        onClick={() => navigate('/add-expense')}
        aria-label="Add offline spending"
        whileTap={{ scale: 0.92 }}
      >
        <Plus size={22} strokeWidth={2} />
      </motion.button>
    </div>
  )
}
