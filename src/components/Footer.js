import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      {/* Optional “Why Choose” section above the dark footer */}
      <div className="footer-why-choose">
        <h2 className="why-choose-title">Why Choose Preloved?</h2>
        <p className="why-choose-text">
          Whether you’re cleaning out your closet or hunting for a hidden gem, <br />
          Preloved makes it easy, fast, and fun to connect with others in your community.
        </p>
      </div>

      {/* Main dark footer area */}
      <div className="footer-main">
        <div className="footer-container">
          {/* Left column: Brand + tagline */}
          <div className="footer-column">
            <h3 className="footer-heading">PRELOVED</h3>
            <p className="footer-text">
              Buy, sell, and explore second-hand treasures safely with <br />
              PreLoved.
            </p>
          </div>

          {/* Center column: Contact Info */}
          <div className="footer-column">
            <h3 className="footer-heading">Contact Us</h3>
            <ul className="contact-list">
              <li>
                <strong>Email:</strong> <a href="mailto:support@rentalhaven.com">support@rentalhaven.com</a>
              </li>
              <li>
                <strong>Phone:</strong> +64 123 456 789
              </li>
              <li>
                <strong>Location:</strong> Auckland, New Zealand
              </li>
            </ul>
          </div>

          {/* Right column: Help & Support */}
          <div className="footer-column">
            <h3 className="footer-heading">Help &amp; Support</h3>
            <p className="footer-text">
              If you’re facing issues, please don’t hesitate to reach out.
            </p>
            <a href="/help-center" className="help-button">
              Go to Help Center
            </a>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="footer-bottom">
          © 2025 Rental Haven. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
