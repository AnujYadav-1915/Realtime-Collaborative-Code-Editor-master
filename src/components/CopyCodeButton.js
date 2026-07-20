import React, { useState } from "react";
import toast from "react-hot-toast";
import "./CopyCodeButton.css";

const CopyCodeButton = ({ codeRef }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      const code = codeRef.current || "";
      if (!code.trim()) {
        toast.error("Nothing to copy!");
        return;
      }
      
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      toast.success("Code copied to clipboard!");
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error("Failed to copy code. Please try again.");
    }
  };

  return (
    <button 
      className={`copy-code-btn ${isCopied ? 'copied' : ''}`} 
      onClick={handleCopyCode}
      title="Copy all code to clipboard"
    >
      <span className="icon">{isCopied ? "✓" : "📋"}</span>
      <span className="text">{isCopied ? "Copied!" : "Copy Code"}</span>
    </button>
  );
};

export default CopyCodeButton;
