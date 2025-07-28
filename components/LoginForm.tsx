'use client';

declare global {
  interface Window {
    userData: any;
  }
}

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { fetchRandomQuote, Quote } from '../utils/dataFetcher';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useToast } from "../hooks/use-toast";
import { updateFirstLoginStatus } from '../utils/dataStore';

export default function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [quote, setQuote] = useState<Quote | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        /**
         * Récupère une citation aléatoire via l'API `fetchRandomQuote`
         * et la stocke dans l'état `quote`.
         * Si la citation n'est pas trouvée, un message par défaut est stocké.
         */
        const getQuote = async () => {
            const randomQuote = await fetchRandomQuote();
            console.log('Random quote:', randomQuote);
            setQuote(randomQuote || null);
        };
        getQuote();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ USER_NAME: username, USER_PASSWORD: password })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.log('Erreur lors de la connexion:', errorText);
                setError('Identifiant ou mot de passe incorrect');
                return;
            }

            const userData = await response.json();
            console.log('(loginForm) utilisateur :', userData);
            
            // Mettre à jour le statut de première connexion
            updateFirstLoginStatus();

            // Stocker les informations de l'utilisateur dans localStorage
            localStorage.setItem('userData', JSON.stringify(userData));

            router.push('/dashboard');
        } catch (err) {
            console.log('Erreur lors de la connexion:', err);
            setError('Une erreur est survenue lors de la connexion');
        }
    };

    return (
        <>
        <div className="flex items-center">
            <div style={{ position: 'relative', top: 5, left: 10 }}>
                <Image src="/logo_bbl-groupe2.png" alt="Logo BBL Groupe" width={100} height={70} />
            </div>
            <div className="w-full flex absolute justify-center top-1">
                <span className="text-black text-2xl ">Bienvenue à bord du Spacecraft Discovery One !</span>
            </div>
        </div>

        <div className="text-center h-8 ">
            <span className="text-black "></span>
        </div>
        <div className="text-center h-20 ">
            <span className="text-black "></span>
        </div>
      
        <div className="flex items-center justify-center ">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Connexion
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="username" className="sr-only">
                                Identifiant
                            </label>
                            {error && (
                                <div className="text-red-500 text-sm text-center">
                                    {error}
                                </div>
                            )}
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Identifiant"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Mot de passe
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)} />
                        </div>
                    </div>

                    <div className="text-right mt-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="text-indigo-600 hover:text-indigo-500 text-sm"
                        >
                            Mot de passe oublié ?
                        </button>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Open the doors, HAL !
                        </button> {/* OK */}
                    </div>


                </form>
            </div>
        </div>
        <div className="text-center h-12 ">
            <span className="text-black "></span>
        </div>
 
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Renvoyer le mot de passe</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Input
                            type="email"
                            placeholder="Entrez votre email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isLoading}
                        >
                            Fermer
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!email) {
                                    toast({
                                        title: "Erreur",
                                        description: "Veuillez saisir votre email",
                                        variant: "destructive",
                                        id: ""
                                    });
                                    return;
                                }

                                setIsLoading(true);
                                try {
                                    const response = await fetch('/api/auth/forgot-password', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ email })
                                    });

                                    if (!response.ok) {
                                        const errorData = await response.json();
                                        toast({
                                            title: "Erreur",
                                            description: errorData.message || "Aucun compte trouvé avec cet email",
                                            variant: "destructive",
                                            id: ""
                                        });
                                        setIsLoading(false);
                                        return;
                                    }

                                    // The API should handle checking the email and sending the password
                                    toast({
                                        title: "Succès",
                                        description: "Un email contenant votre mot de passe a été envoyé",
                                        id: ""
                                    });
                                    setIsModalOpen(false);
                                } catch (error) {
                                    console.log('Erreur:', error);
                                    toast({
                                        title: "Erreur",
                                        description: "Une erreur est survenue lors de la réinitialisation",
                                        variant: "destructive",
                                        id: ""
                                    });
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? "Envoi..." : "Envoyer"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {quote && (
            <div className="text-center w-full flex justify-center">
                <div className="text-black text-sm bg-x-100 inline-block p-4 rounded-lg">
                    <div className="text-black italic text-xl pb-0 mb-0">"{quote.citation}"</div>
                    <div className="text-black font-bold text-xs mt-2 mr-[20%] text-right">- {quote.auteur}</div>
                </div>
            </div>
        )}
    </>
    );
}
