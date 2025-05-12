// src/components/common/AutoDismissToast.tsx
import { useState, useEffect } from 'react';

interface AutoDismissToastProps {
  message: string;
  visible: boolean;
  duration?: number; // in milliseconds
}

/**
 * A toast component that auto-dismisses after a specified duration
 * and has entrance/exit animations
 */
const AutoDismissToast: React.FC<AutoDismissToastProps> = ({ 
  message, 
  visible, 
  duration = 2000 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  
  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout>;
    
    if (visible) {
      // Show the toast with entrance animation
      setIsVisible(true);
      setAnimationClass('show');
      
      // Set timeout to start exit animation
      hideTimeout = setTimeout(() => {
        setAnimationClass('hide');
        
        // After animation completes, actually hide the component
        setTimeout(() => {
          setIsVisible(false);
        }, 300); // Match this to the animation duration
      }, duration);
    }
    
    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [visible, duration]);
  
  // If not visible at all, don't render anything
  if (!isVisible) return null;
  
  return (
    <div className={`update-toast ${animationClass}`}>
      <div className="update-toast-content">
        <span>{message}</span>
        <button 
          onClick={() => {
            setAnimationClass('hide');
            setTimeout(() => setIsVisible(false), 300);
          }} 
          className="close-btn"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default AutoDismissToast;