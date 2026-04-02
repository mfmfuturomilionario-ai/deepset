import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Flame className="w-16 h-16 text-primary mx-auto" />
        <h1 className="text-6xl font-display font-bold text-gradient">404</h1>
        <p className="text-xl text-muted-foreground">Página não encontrada</p>
        <Link to="/dashboard">
          <Button className="gradient-orange text-primary-foreground">Voltar ao início</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
