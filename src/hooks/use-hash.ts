import { useState, useEffect } from "react";

const useHash = () => {
  const [hash, setHash] = useState<string>(
    typeof window !== "undefined" ? window.location.hash : ""
  );

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return hash;
};

export default useHash;
