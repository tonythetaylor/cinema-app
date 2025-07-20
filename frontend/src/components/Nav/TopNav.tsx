import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaSearch, FaBell } from "react-icons/fa";
import logo from "/src/tinyvue_logo.png";
import avatar from "/src/avatar.png";

export default function TopNav() {
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setHidden(true); // scroll down → hide
      } else {
        setHidden(false); // scroll up → show
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Don't show navbar if not logged in
  if (!token) return null;

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500
        ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"}
        bg-gradient-to-b from-black/80 via-black/60 to-transparent px-2 md:px-4 flex items-center justify-between text-white`}
    >
      {/* Left: Logo + Links */}
      <div className="flex items-center gap-8">
        <Link to="/">
          <img
            src={logo}
            alt="TinyVue"
            className="h-16 md:h-20 lg:h-24 xl:h-28 object-contain"
          />
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-gray-300">Home</Link>
          <Link to="/series" className="hover:text-gray-300">Series</Link>
          <Link to="/movies" className="hover:text-gray-300">Movies</Link>
          <Link to="/new" className="hover:text-gray-300">New & Popular</Link>
          <Link to="/my-list" className="hover:text-gray-300">My List</Link>
        </nav>
      </div>

      {/* Right: Icons + Logout */}
      <div className="flex items-center gap-6 text-xl">
        <button className="hover:text-gray-300">
          <FaSearch />
        </button>
        <button className="hover:text-gray-300">
          <FaBell />
        </button>
        <img
          src={avatar}
          alt="Profile"
          className="h-8 w-8 filter invert sepia hue-rotate-180"
        />
        <button
          onClick={() => {
            localStorage.removeItem("accessToken");
            window.location.href = "/login";
          }}
          className="text-sm hover:text-gray-300 ml-4"
        >
          Logout
        </button>
      </div>
    </header>
  );
}