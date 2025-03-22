import "react";
import "./EmailTemplate.css"; 

// eslint-disable-next-line react/prop-types
const EmailTemplate = ({ subscriberName }) => {
  return (
    <div className="email-body">
      <div className="container">
        <h1>Welcome to Our Newsletter!</h1>
        <p>Hello {subscriberName},</p>
        <p>
          Thank you for subscribing to our newsletter. We are excited to have you
          on board and look forward to sharing our updates with you.
        </p>
        <p>
          Best Regards,
          <br />
          The Newsletter Team
        </p>
        <div className="footer">
          <p>You are receiving this email because you subscribed to our newsletter.</p>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplate;
