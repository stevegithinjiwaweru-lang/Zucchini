import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Merchants: React.FC = () => {
  const nav = useNavigate();

  useEffect(() => {
    // Redirect merchants page to ratings — merchants management is removed
    nav('/ratings', { replace: true });
  }, [nav]);

  return null;
};

export default Merchants;
