import "react";
import {
  FaFacebookF,
  FaWhatsapp,
  FaLinkedinIn,
  FaInstagram,
} from "react-icons/fa";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Left Section */}
        <div className="footer-content-left">
          <img src="Logos.jpg" alt="TechAlpha Logo" className="logo" />
          <p className="footer-description">
            At TechAlpha Hub, we connect innovative minds and technologies to
            solve real-world problems.
          </p>
        </div>

        {/* Center Section - Fast Links */}
        <div className="footer-content-center">
          <h1>FAST LINKS</h1>
          <ul className="fast-links">
            <li>
              <a href="#">About Us</a>
            </li>
            <li>
              <a href="#">Privacy Policy</a>
            </li>
            <li>
              <a href="#">Terms & Conditions</a>
            </li>
          </ul>
        </div>

        {/* Right Section */}
        <div className="footer-content-right">
          <h1>GET IN TOUCH</h1>
          <div className="footer-social-icons">
            <a href="#" className="facebook">
              <FaFacebookF size={30} />
            </a>
            <a href="#" className="whatsapp">
              <FaWhatsapp size={30} />
            </a>
            <a href="#" className="linkedin">
              <FaLinkedinIn size={30} />
            </a>
            <a href="#" className="instagram">
              <FaInstagram size={30} />
            </a>
          </div>
        </div>
      </div>

      <hr />

      <p className="footer-copyright">
        DaleTech © 2025. All Rights Reserved.
      </p>
    </footer>
  );
};

export default Footer;
