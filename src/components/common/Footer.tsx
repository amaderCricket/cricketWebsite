// src/components/common/Footer.tsx
import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <h3>Amader Cricket Club</h3>
            <p>
              Established in 2010, Amader Cricket Club has been a leading cricket club 
              committed to excellence both on and off the field.
            </p>
          </div>
          <div className="footer-col">
            <h3>Quick Links</h3>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/players">Players</Link></li>
              <li><Link to="/matches">Matches</Link></li>
              <li><Link to="/hall-of-fame">Hall of Fame</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Contact Us</h3>
            <address>
              <p>Amader Stadium</p>
              <p>123 Cricket Avenue</p>
              <p>Dhaka, Bangladesh</p>
              <p>Email: info@Amadercricket.com</p>
              <p>Phone: +880 1234 567890</p>
            </address>
          </div>
          <div className="footer-col">
            <h3>Follow Us</h3>
            <div className="social-links">
              <a href="#">FB</a>
              <a href="#">TW</a>
              <a href="#">IG</a>
              <a href="#">YT</a>
            </div>
          </div>
        </div>
        <div className="copyright">
          <p>&copy; 2025 Amader Cricket Club. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer