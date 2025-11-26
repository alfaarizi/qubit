import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    Cpu,
    Zap,
    BarChart3,
    Layers,
    GitBranch,
    Sparkles,
    CheckCircle2,
    ExternalLink
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import {ModeToggle} from "@/components/common/ModeToggle.tsx";
import squanderLogoLight from '@/assets/squander_logo_light.jpeg';
import squanderLogoDark from '@/assets/squander_logo_dark.jpeg';
import { useTheme } from '@/providers/ThemeProvider';

function HomePage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { theme } = useTheme();

    const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const navigateToComposer = () => {
        navigate('/project');
    };

    const featureColors = [
        'from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400',
        'from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400',
        'from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400',
        'from-orange-500/10 to-amber-500/10 text-orange-600 dark:text-orange-400',
        'from-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400',
        'from-rose-500/10 to-red-500/10 text-rose-600 dark:text-rose-400'
    ];

    const features = [
        {
            icon: <Cpu className="w-6 h-6" />,
            title: t('homepage.features.visualComposer.title'),
            description: t('homepage.features.visualComposer.description'),
            color: featureColors[0]
        },
        {
            icon: <GitBranch className="w-6 h-6" />,
            title: t('homepage.features.partitioning.title'),
            description: t('homepage.features.partitioning.description'),
            color: featureColors[1]
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: t('homepage.features.simulation.title'),
            description: t('homepage.features.simulation.description'),
            color: featureColors[2]
        },
        {
            icon: <BarChart3 className="w-6 h-6" />,
            title: t('homepage.features.visualizations.title'),
            description: t('homepage.features.visualizations.description'),
            color: featureColors[3]
        },
        {
            icon: <Layers className="w-6 h-6" />,
            title: t('homepage.features.management.title'),
            description: t('homepage.features.management.description'),
            color: featureColors[4]
        },
        {
            icon: <Sparkles className="w-6 h-6" />,
            title: t('homepage.features.educational.title'),
            description: t('homepage.features.educational.description'),
            color: featureColors[5]
        }
    ];

    const capabilities = [
        t('homepage.capabilities.items.multiQubit'),
        t('homepage.capabilities.items.gateLibrary'),
        t('homepage.capabilities.items.stateVector'),
        t('homepage.capabilities.items.partition'),
        t('homepage.capabilities.items.qasm'),
        t('homepage.capabilities.items.bloch'),
        t('homepage.capabilities.items.measurement'),
        t('homepage.capabilities.items.entanglement')
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Language Switcher - Top Right */}
            <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
                <ModeToggle modal={false} />
                <LanguageSwitcher modal={false} />
            </div>

            {/* Hero Section */}
            <div className="relative overflow-hidden">
                {/* Gradient Background Elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-background to-purple-50 dark:from-blue-950/20 dark:via-background dark:to-purple-950/20" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl" />

                <div className="container relative mx-auto px-4 py-20 md:py-32">
                    <div className="flex flex-col items-center text-center space-y-8 max-w-5xl mx-auto">
                        <Badge variant="secondary" className="text-sm px-4 py-1.5 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            <Sparkles className="w-3 h-3 mr-1.5" />
                            {t('homepage.badge')}
                        </Badge>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                            <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 dark:from-gray-100 dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                                {t('homepage.hero.title')}
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl leading-relaxed font-light">
                            {t('homepage.hero.subtitle')}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-6">
                            <Button
                                size="lg"
                                onClick={navigateToComposer}
                                className="text-lg px-10 py-7 group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                            >
                                {t('homepage.hero.getStarted')}
                                <span className="inline-block ml-2 w-5">
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="text-lg px-10 py-7 border-2 hover:bg-muted/50"
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                {t('homepage.hero.learnMore')}
                            </Button>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-12 pt-12 w-full max-w-3xl">
                            <div className="space-y-2">
                                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">12+</div>
                                <div className="text-sm md:text-base text-muted-foreground font-medium">{t('homepage.stats.qubits')}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">20+</div>
                                <div className="text-sm md:text-base text-muted-foreground font-medium">{t('homepage.stats.gates')}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">7</div>
                                <div className="text-sm md:text-base text-muted-foreground font-medium">{t('homepage.stats.visualizations')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div id="features" className="relative py-20 md:py-32 bg-gradient-to-b from-background via-muted/20 to-background">
                <div className="container mx-auto px-4">
                    <div className="text-center space-y-4 mb-16 max-w-3xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('homepage.features.title')}</h2>
                        <p className="text-muted-foreground text-lg md:text-xl font-light">
                            {t('homepage.features.subtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                        {features.map((feature, index) => (
                            <Card key={index} className="group hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 transition-all duration-300 border-border/40 bg-card/50 backdrop-blur-sm hover:border-border hover:-translate-y-1">
                                <CardHeader className="space-y-4">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        {feature.icon}
                                    </div>
                                    <CardTitle className="text-2xl font-semibold">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed font-light">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* SQUANDER Section */}
            <div className="relative py-20 md:py-32 overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-blue-950/20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/20 to-indigo-500/20 dark:from-purple-500/10 dark:to-indigo-500/10 rounded-full blur-3xl" />

                <div className="container relative mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col items-center text-center space-y-8 p-12 md:p-16 rounded-3xl bg-background/80 dark:bg-background/40 backdrop-blur-xl border border-purple-200/50 dark:border-purple-800/30 shadow-2xl">
                            <div className="flex flex-col items-center gap-6">
                                <h2 className="text-4xl md:text-5xl font-bold">
                                    <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">
                                        {t('homepage.squander.title')}
                                    </span>
                                </h2>
                                <img
                                    src={isDarkMode ? squanderLogoDark : squanderLogoLight}
                                    alt="SQUANDER"
                                    className="h-20 md:h-32"
                                />
                            </div>
                            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-2xl font-light">
                                {t('homepage.squander.description')}
                            </p>
                            <Button
                                variant="outline"
                                size="lg"
                                className="gap-2 px-8 py-6 text-base border-2 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-400 dark:hover:border-purple-600 transition-all shadow-lg"
                                onClick={() => window.open('https://github.com/rakytap/sequential-quantum-gate-decomposer', '_blank')}
                            >
                                {t('homepage.squander.learn')}
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Capabilities Section */}
            <div className="relative py-20 md:py-32 bg-gradient-to-b from-background to-muted/30">
                <div className="container mx-auto px-4">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center space-y-4 mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('homepage.capabilities.title')}</h2>
                            <p className="text-muted-foreground text-lg md:text-xl font-light">
                                {t('homepage.capabilities.subtitle')}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">
                            {capabilities.map((capability, index) => (
                                <div key={index} className="group flex items-start gap-4 p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/40 hover:border-green-500/30 hover:bg-card/80 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300">
                                    <div className="flex-shrink-0 w-6 h-6 mt-0.5">
                                        <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <span className="text-foreground font-medium leading-relaxed">{capability}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="relative py-20 md:py-32 overflow-hidden">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20" />
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-3xl" />

                <div className="container relative mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col items-center text-center space-y-8 p-12 md:p-20 rounded-3xl bg-background/80 dark:bg-background/40 backdrop-blur-xl border border-blue-200/50 dark:border-blue-800/30 shadow-2xl">
                            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                                {t('homepage.cta.title')}
                            </h2>
                            <p className="text-muted-foreground text-lg md:text-xl font-light max-w-2xl leading-relaxed">
                                {t('homepage.cta.subtitle')}
                            </p>
                            <Button
                                size="lg"
                                onClick={navigateToComposer}
                                className="text-lg px-12 py-7 group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                            >
                                {t('homepage.cta.button')}
                                <span className="inline-block ml-2 w-5">
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="py-12 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="text-center text-muted-foreground text-sm font-light">
                        <p>{t('homepage.footer.text')}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default HomePage;
