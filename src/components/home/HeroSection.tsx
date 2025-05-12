// src/components/home/HeroSection.tsx
import { useEffect, useState, useRef } from 'react'

function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const intervalRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const slides = [
    {
      imageUrl: 'src/assets/hero/hero_1.jpg',
      title: 'Lets Play Cricket',
      subtitle: 'Where Colleagues Become Competitors',
    },
    {
      imageUrl: 'src/assets/hero/hero_2.jpg',
      title: 'Office League',
      subtitle: 'Break The Stamps!',
    },
    {
      imageUrl: 'src/assets/hero/hero_3.jpg',
      title: 'Join the Game',
      subtitle: 'Sign up for the next match',
    }
  ];

  // Mouse tracking for cricket ball
    useEffect(() => {
      let animationId: number;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      const handleMouseMove = (e: MouseEvent) => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          targetX = e.clientX - rect.left;
          targetY = e.clientY - rect.top;
        }
      };

    // Smooth animation loop
        const animate = () => {
          // Lerp (linear interpolation) for smooth movement
          currentX += (targetX - currentX) * 0.1;
          currentY += (targetY - currentY) * 0.1;
          
          setMousePosition({
            x: currentX,
            y: currentY
          });
          
          animationId = requestAnimationFrame(animate);
        };

        const container = containerRef.current;
        if (container) {
          container.addEventListener('mousemove', handleMouseMove);
          animate();
        }

        return () => {
          if (container) {
            container.removeEventListener('mousemove', handleMouseMove);
          }
          if (animationId) {
            cancelAnimationFrame(animationId);
          }
        };
        }, []);

  // Auto slide
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 7000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };
  
  return (
    <section className="hero-section" ref={containerRef}>
      {/* Simple gradient overlay */}
      <div className="hero-gradient-overlay" />
      
      {/* Moving cricket ball */}
      <div 
        className="cricket-ball-float"
        style={{
          left: `${mousePosition.x}px`,
          top: `${mousePosition.y}px`
        }}
      />
      
      {/* Slider with CSS transitions */}
      <div className="hero-slider">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.imageUrl})` }}
          >
            <div className="overlay">
              <div className="hero-content">
                <h1 className={`hero-title ${index === currentSlide ? 'animate' : ''}`}>
                  {slide.title}
                </h1>
                
                <p className={`hero-subtitle ${index === currentSlide ? 'animate' : ''}`}>
                  {slide.subtitle}
                </p>
                
                <div className={`button-group ${index === currentSlide ? 'animate' : ''}`}>
                  <a href="/hall-of-fame" className="btn btn-accent">
                    Hall of Fame
                  </a>
                  <a href="/players" className="btn btn-outline-light">
                    Our Players
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Slide Navigation */}
      <div className="slide-nav">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`nav-dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
          >
            <span className="progress" />
          </button>
        ))}
      </div>
    </section>
  )
}

export default HeroSection