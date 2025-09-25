// src/components/HealthCheck.tsx
import React, { useState } from "react";
import { useWebSocketHealth } from "@/hooks/useWebSocketHealth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
    Loader2,
    RefreshCw,
    Wifi,
    WifiOff,
} from "lucide-react";

const HealthCheck: React.FC = () => {
    const { status, isWebSocketConnected, recheckHttp } = useWebSocketHealth();
    const [loading, setLoading] = useState(false);

    const handleRecheck = async () => {
        setLoading(true);
        await Promise.all([
            recheckHttp(),
            new Promise(res => setTimeout(res, 400))
        ]);
        setLoading(false);
    };

    const config = {
        loading: {
            class: "border-yellow-100 bg-yellow-50 text-yellow-800",
            icon: <Loader2 className="h-5 w-5 animate-spin" />,
            badge: "LOADING",
            variant: "secondary" as const,
        },
        healthy: {
            class: "border-green-100 bg-green-50 text-green-800",
            icon: <CheckCircle className="h-5 w-5" />,
            badge: "HEALTHY",
            variant: "default" as const,
        },
        degraded: {
            class: "border-orange-100 bg-orange-50 text-orange-800",
            icon: <AlertTriangle className="h-5 w-5" />,
            badge: "DEGRADED",
            variant: "secondary" as const,
        },
        offline: {
            class: "border-red-100 bg-red-50 text-red-800",
            icon: <XCircle className="h-5 w-5" />,
            badge: "OFFLINE",
            variant: "destructive" as const,
        },
    }[status];

    const messages = {
        loading: "Connecting to backend...",
        healthy: "All systems operational",
        degraded: "Partial connectivity issues",
        offline: "Backend unavailable",
    };

    return (
        <Card className={`${config.class} border-2`}>
            <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                    {config.icon}
                    <p className="font-medium">{messages[status]}</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* WebSocket indicator */}
                    <div className="flex items-center gap-1">
                        {isWebSocketConnected ? (
                            <Wifi className="h-4 w-4 text-green-600" />
                        ) : (
                            <WifiOff className="h-4 w-4 text-red-600" />
                        )}
                        <span
                            className={`h-2 w-2 rounded-full ${
                                isWebSocketConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                            }`}
                        />
                    </div>

                    <Badge variant={config.variant}>{config.badge}</Badge>

                    <Button
                        onClick={handleRecheck}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 hover:bg-current/10"
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <RefreshCw className="h-3 w-3" />
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default HealthCheck;
