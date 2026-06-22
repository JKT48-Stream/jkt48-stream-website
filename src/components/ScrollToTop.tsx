import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll window utama
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Scroll semua elemen yang mungkin punya scroll sendiri
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Scroll elemen main dan semua container yang overflow
    const scrollables = document.querySelectorAll(
      "main, [data-scroll-container], .overflow-y-auto, .overflow-auto"
    );
    scrollables.forEach((el) => {
      el.scrollTop = 0;
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;