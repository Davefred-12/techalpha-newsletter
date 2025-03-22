/* eslint-disable react/no-unescaped-entities */
import "react";
import "./EmailTemplate2.css";

const EmailTemplate2 = () => {
  return (
    <div className="container">
      {/* Header Section */}
      <h1>Unlock Premium Websites Tailored for Your Business 🚀</h1>

      {/* Flex container for sections */}
      <div className="sections-container">
        {/* Introduction Section */}
        <div className="section">
          <h2>Why Your Business Deserves a Premium Website</h2>
          <p>
            In today's digital world, your website is your business's first
            impression. At <strong>TechAlpha Hub</strong>, we specialize in
            creating stunning, user-friendly websites that reflect your brand's
            vision and drive results.
          </p>
          <a href="https://techalphahub.com/portfolio/" className="portfolio-link">
            Explore Our Portfolio
          </a>
        </div>

        {/* Showcase Section */}
        <div className="section">
          <h2>Trusted by Businesses</h2>
          <p>
            From startups to established organizations, we design websites that:
          </p>
          <ul>
            <li>✅ Enhance brand credibility</li>
            <li>✅ Attract and engage customers</li>
            <li>✅ Boost your online presence</li>
          </ul>
        </div>

        {/* Why Choose Us Section */}
        <div className="section">
          <h2>Our Edge: Experience & Innovation</h2>
          <ul>
            <li>
              💻 <strong>Tailored Designs</strong>: Every website is unique
            </li>
            <li>
              ⚡ <strong>Speed & Performance</strong>: Fast-loading & secure
            </li>
            <li>
              🎯 <strong>SEO & Growth Ready</strong>: Rank higher naturally
            </li>
          </ul>
        </div>

        {/* Call to Action Section */}
        <div className="section">
          <h2>Let&apos;s Build Your Dream Website</h2>
          <p>
            Take the first step toward a transformative online presence. Partner
            with TechAlpha Hub and bring your vision to life.
          </p>
          <a href="https://wa.me/2349050371011" className="button">
            Get Started Now
          </a>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplate2;