import { motion } from 'framer-motion';

function Preloader() {
  return (
    <motion.div 
      className="cricket-preloader"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="preloader-content">
        {/* Animated Cricket Bat */}
        <motion.div 
          className="cricket-bat"
          animate={{
            rotate: [-45, 45, -45],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Animated Cricket Ball */}
        <motion.div 
          className="cricket-ball"
          animate={{
            x: [-100, 100, -100],
            y: [0, -50, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Loading Text */}
        <motion.p 
          className="loading-text"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading...
        </motion.p>
      </div>
    </motion.div>
  );
}

export default Preloader;