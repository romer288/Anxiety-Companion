import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t py-4 px-6 text-sm text-muted-foreground">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <p>© {new Date().getFullYear()} Anxiety Companion. All rights reserved.</p>
        </div>
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="hover:underline">Terms of Service</Link>
          <Link to="/contact" className="hover:underline">Contact Us</Link>
        </div>
      </div>
      <div className="mt-2 text-xs">
        <p>
          This app is not a substitute for professional medical advice, diagnosis, or treatment.
          Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
        </p>
      </div>
    </footer>
  );
}