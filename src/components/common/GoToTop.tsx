// src/components/common/GoToTop.tsx
import { useEffect, useState } from 'react';

interface GoToTopProps {
  scrollThreshold?: number;
}

function GoToTop({ scrollThreshold = 300 }: GoToTopProps) {
  const setScrollY = useState(0)[1];
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setIsVisible(window.scrollY > scrollThreshold);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollThreshold]);
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div 
      onClick={scrollToTop}
      className="go-to-top"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '50px',
        height: '50px',
        backgroundColor: '#2D7783',
        color: 'white',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        zIndex: 100,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isVisible ? '1' : '0',
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.5)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px) scale(1.1)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
      }}
    >
      <i 
        className="material-icons" 
        style={{
          fontSize: '28px',
          fontWeight: 'bold',
          transition: 'transform 0.3s ease'
        }}
      >
        keyboard_arrow_up
      </i>
    </div>
  );
}

export default GoToTop;