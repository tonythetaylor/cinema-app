// Layout.tsx
import { useLocation } from "react-router-dom";
import TopNav from "../Nav/TopNav";
import { useAuth } from "../../context/AuthContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  // Define paths where nav should be hidden
  const hideNavPaths = [
    /^\/party\/[^/]+\/watch$/,  // /party/:id/watch
    // add other paths if needed
  ];

  const shouldHideNav = hideNavPaths.some((regex) => regex.test(location.pathname));

  return (
        <div className="h-screen bg-gray-900">

      {!shouldHideNav && user && <TopNav />}
      {children}
    </div>
  );
}