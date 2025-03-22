/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import "./ThankYouPage.css";
import { Link } from "react-router-dom";

const ThankYouPage = ({ subscriberName }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <div className={`thank-you-page ${animate ? "animate" : ""}`}>
      <div className="thank-you-container">
        <div className="check-mark">
          <svg viewBox="0 0 50 50">
            <path className="check" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>

        <h1 className="welcome-text">
          Welcome aboard,{" "}
          <span className="subscriber-name">{subscriberName}</span>!
        </h1>

        <div className="message-container">
          <p className="thank-you-message">
            Thank you for subscribing to our newsletter!
          </p>
          <p className="confirmation-message">
            We&apos;re excited to share our latest updates and insights with
            you.
          </p>
        </div>

        <div className="next-steps">
          <h2>What&lsquo;s Next?</h2>
          <ul>
            <li>Check your inbox for a confirmation email</li>
            <li>Add us to your contacts to never miss an update</li>
            <li>Look out for our next newsletter!</li>
          </ul>
        </div>

        <div className="social-share">
          <p>Check out more about us</p>
          <Link to="/send-template2" className="btn btn-secondary">
            Explore our Portfolio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
