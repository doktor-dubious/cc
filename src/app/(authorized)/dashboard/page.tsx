'use client';

import { useUser } from '@/context/UserContext';


const Dashboard = () =>
{
    const user = useUser();

    return (
<div>
    <h1 className="text-2xl font-bold mb-4">Welcome {user.name}</h1>
    <p className="text-muted-foreground">Email: {user.email}</p>
    {user.nickname && (
    <p className="text-muted-foreground">Nickname: {user.nickname}</p>
    )}
</div>
    );
}

export default Dashboard;