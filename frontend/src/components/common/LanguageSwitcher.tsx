import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const languages = [
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
    { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

interface LanguageSwitcherProps {
    modal?: boolean;
}

export function LanguageSwitcher({ modal = true }: LanguageSwitcherProps) {
    const { i18n } = useTranslation();

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    const changeLanguage = (langCode: string) => {
        void i18n.changeLanguage(langCode);
    };

    return (
        <DropdownMenu modal={modal}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="language-switcher">
                    <Languages className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentLanguage.name}</span>
                    <span className="sm:hidden">{currentLanguage.flag}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((language) => (
                    <DropdownMenuItem
                        key={language.code}
                        onClick={() => changeLanguage(language.code)}
                        className={i18n.language === language.code ? 'bg-accent' : ''}
                    >
                        <span className="mr-2">{language.flag}</span>
                        {language.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
