// src/components/home/HeroSection.tsx
import { useEffect, useState, useRef } from 'react'
import hero1 from '../../assets/hero/hero_1.jpg';
import hero2 from '../../assets/hero/hero_2.jpg';
import hero3 from '../../assets/hero/hero_3.jpg';

function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const intervalRef = useRef<number | null>(null);
  
  const slides = [
    {
      imageUrl: hero1,
      title: 'Lets Play Cricket',
      subtitle: 'Where Colleagues Become Competitors',
    },
    {
      imageUrl: hero2,
      title: 'Office League',
      subtitle: 'Break The Stamps!',
    },
    {
      imageUrl: hero3,
      title: 'Join the Game',
      subtitle: 'Sign up for the next match',
    }
  ];

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
    <section className="hero-section">
      {/* Simple gradient overlay */}
      <div className="hero-gradient-overlay" />
      
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