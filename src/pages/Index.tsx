import { ChatWidget } from "@/components/chat/ChatWidget";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MessageCircle, Shield, Users, Zap } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">Zenex</span>
          </div>
          <Link to="/staff">
            <Button variant="outline" size="sm">
              Staff Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Welcome to{" "}
            <span className="gradient-text">Zenex Support</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get instant help from our dedicated support team. We're here 24/7 to assist you with any questions or concerns.
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 pt-12">
            <div className="p-6 rounded-2xl bg-card border border-border card-shadow">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 mx-auto">
                <MessageCircle className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground">
                Connect instantly with our support team through real-time chat.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border card-shadow">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 mx-auto">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Expert Team</h3>
              <p className="text-sm text-muted-foreground">
                Our trained specialists are ready to solve your problems.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border card-shadow">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 mx-auto">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Secure</h3>
              <p className="text-sm text-muted-foreground">
                Your conversations are private and protected.
              </p>
            </div>
          </div>

          <div className="pt-8">
            <p className="text-muted-foreground">
              Click the chat icon in the bottom right to start a conversation →
            </p>
          </div>
        </div>
      </main>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default Index;
