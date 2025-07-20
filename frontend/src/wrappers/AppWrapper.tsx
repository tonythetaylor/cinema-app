import { useLocation, useParams } from "react-router-dom";
import Layout from "../components/Layouts/Layout";
import { useAuth } from "../context/AuthContext";
import { SocketProvider } from "../context/SocketContext";
import AppRoutes from "../routes/routes";


export default function AppWrapper() {
  const { user } = useAuth();
  const location = useLocation();
  const params = useParams();

  const watchPartyId = params.id || location.state?.watchPartyId || null;
  const userId = user?.username || "anonymous";
  const displayName = user?.username || "anonymous";

  return (
    <SocketProvider watchPartyId={watchPartyId} userId={userId} displayName={displayName}>
      <Layout>
        <AppRoutes />
      </Layout>
    </SocketProvider>
  );
}