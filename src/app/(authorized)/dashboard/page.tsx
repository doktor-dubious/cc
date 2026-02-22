'use client';

import { useUser } from '@/context/UserContext';
import { useTranslations } from 'next-intl';


const Dashboard = () =>
{
    const user = useUser();
    const t = useTranslations('Dashboard');

    return (
<div>
    <h1 className="text-2xl font-bold mb-4">{t('welcome', { name: user.name })}</h1>
    <p className="text-muted-foreground">{t('email', { email: user.email })}</p>
    {user.nickname && (
    <p className="text-muted-foreground">{t('nickname', { nickname: user.nickname })}</p>
    )}
</div>
    );
}

export default Dashboard;
