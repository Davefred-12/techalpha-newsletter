import "react";
import "./NewsletterSent.css"; // Import the CSS file

const NewsletterSent = () => {
  return (
    <>
      <div className="container mt-5">
        <h1 className="text-center">Newsletter Sent!</h1>
        <p className="text-center mt-4">
          The newsletter has been successfully sent to all subscribers.
        </p>
        <div className="text-center mt-4">
          <a className="btn btn-primary" href="/">
            Home
          </a>
          <a className="btn btn-secondary ms-3" href="/send-newsletter">
            Send Another Newsletter
          </a>
        </div>
      </div>
    </>
  );
};

export default NewsletterSent;
