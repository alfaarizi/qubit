// src/components/HealthCheck.tsx
import React, { useState } from "react";
import { useWebSocketHealth } from "@/hooks/useWebSocketHealth.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
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
    const { status, checkHealth } = useWebSocketHealth();
    const [isLoading, setIsLoading] = useState(false);

    const handleCheckHealth = async () => {
        setIsLoading(true);
        await Promise.all([
            checkHealth(),
            new Promise(resolve => setTimeout(resolve, 200)) // UX delay
        ]);
        setIsLoading(false);
    };

    const statusConfig = {
        loading: {
            message: "Checking system health...",
            className: "border-yellow-100 bg-yellow-50 text-yellow-800",
            icon: <Loader2 className="h-5 w-5 animate-spin" />,
            badge: "LOADING",
            variant: "secondary" as const,
            wsIcon: <Wifi className="h-4 w-4 text-yellow-600" />,
            wsIndicator: "bg-yellow-500",
        },
        healthy: {
            message: "All systems operational",
            className: "border-green-100 bg-green-50 text-green-800",
            icon: <CheckCircle className="h-5 w-5" />,
            badge: "HEALTHY",
            variant: "default" as const,
            wsIcon: <Wifi className="h-4 w-4 text-green-600" />,
            wsIndicator: "bg-green-500 animate-pulse",
        },
        degraded: {
            message: "Partial service availability",
            className: "border-orange-100 bg-orange-50 text-orange-800",
            icon: <AlertTriangle className="h-5 w-5" />,
            badge: "DEGRADED",
            variant: "secondary" as const,
            wsIcon: <Wifi className="h-4 w-4 text-orange-600" />,
            wsIndicator: "bg-orange-500",
        },
        offline: {
            message: "Services unavailable",
            className: "border-red-100 bg-red-50 text-red-800",
            icon: <XCircle className="h-5 w-5" />,
            badge: "OFFLINE",
            variant: "destructive" as const,
            wsIcon: <WifiOff className="h-4 w-4 text-red-600" />,
            wsIndicator: "bg-red-500",
        },
    }[status];

    return (
        <Card className={`${statusConfig.className} border-2`}>
            <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {statusConfig.icon}
                    <p className="font-medium">{statusConfig.message}</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Connection indicator */}
                    <div className="flex items-center gap-1">
                        {statusConfig.wsIcon}
                        <span className={`h-2 w-2 rounded-full ${statusConfig.wsIndicator}`} />
                    </div>

                    <Badge variant={statusConfig.variant}>{statusConfig.badge}</Badge>

                    <Button
                        onClick={handleCheckHealth}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 hover:bg-current/10"
                        disabled={isLoading}
                    >
                        {isLoading ? (
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
