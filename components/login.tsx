// 'use client';

// declare global {
//   interface Window {
//     userData: any;
//   }
// }

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import Image from 'next/image';
// import { fetchRandomQuote, Quote } from '../utils/dataFetcher';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
// import { Input } from "./ui/input";
// import { Button } from "./ui/button";
// import { useToast } from "@/hooks/use-toast";
// import { updateFirstLoginStatus } from '../utils/dataStore';
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// export default function LoginForm() {
//     const [username, setUsername] = useState('');
//     const [password, setPassword] = useState('');
//     const [error, setError] = useState('');
//     const [quote, setQuote] = useState<Quote | null>(null);
//     const [isModalOpen, setIsModalOpen] = useState(false);
//     const [email, setEmail] = useState('');
//     const [isLoading, setIsLoading] = useState(false);
//     const { toast } = useToast();
//     const router = useRouter();

//     useEffect(() => {
//          /**
//          * Récupère une citation aléatoire via l'API `fetchRandomQuote`
//          * et la stocke dans l'état `quote`.
//          * Si la citation n'est pas trouvée, un message par défaut est stocké.
//          */
//         const getQuote = async () => {
//             const randomQuote = await fetchRandomQuote();
//             console.log('Random quote:', randomQuote);
//             setQuote(randomQuote || null);
//         };
//         getQuote();
//     }, []);

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setError('');

//         try {
//             const response = await fetch('/api/auth/login', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({ username, password })
//             });

//             if (!response.ok) {
//                 const errorText = await response.text();
//                 setError('Identifiant ou mot de passe incorrect');
//                 return;
//             }

//             const userData = await response.json();
//             updateFirstLoginStatus();
//             // Stocker les informations de l'utilisateur dans localStorage
//             localStorage.setItem('userData', JSON.stringify(userData));
//             router.push('/dashboard');
//         } catch (err) {
//             console.error('Erreur lors de la connexion:', err);
//             setError('Une erreur est survenue lors de la connexion');
//         }
//     };

//     return (
//         <div className="w-full max-w-md space-y-8">
//             {/* Header with logo and welcome message */}
//             <div className="text-center space-y-6">
//                 <div className="flex justify-center">
//                     <Image src="/logo_bbl-groupe2.png" alt="Logo BBL Groupe" width={100} height={70} />
//                 </div>
//                 <h1 className="text-xl font-medium text-gray-700">
//                     Bienvenue à bord du Spacecraft Discovery One !
//                 </h1>
//             </div>

//             {/* Login Card */}
//             <Card className="shadow-sm border border-gray-200">
//                 <CardHeader className="text-center pb-4">
//                     <CardTitle className="text-xl font-semibold text-gray-800">Connexion</CardTitle>
//                 </CardHeader>
//                 <CardContent className="pt-0">
//                     <form className="space-y-4" onSubmit={handleSubmit}>
//                         {error && (
//                             <div className="text-red-500 text-sm text-center">
//                                 {error}
//                             </div>
//                         )}
                        
//                         <div className="space-y-3">
//                             <Input
//                                 id="username"
//                                 type="text"
//                                 placeholder="Identifiant"
//                                 value={username}
//                                 onChange={(e) => setUsername(e.target.value)}
//                                 required
//                                 className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
//                             />
//                             <Input
//                                 id="password"
//                                 type="password"
//                                 placeholder="Mot de passe"
//                                 value={password}
//                                 onChange={(e) => setPassword(e.target.value)}
//                                 required
//                                 className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
//                             />
//                         </div>

//                         <div className="text-right">
//                             <button
//                                 type="button"
//                                 onClick={() => setIsModalOpen(true)}
//                                 className="text-purple-600 hover:text-purple-700 text-sm font-medium"
//                             >
//                                 Mot de passe oublié ?
//                             </button>
//                         </div>

//                         <Button
//                             type="submit"
//                             className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
//                             disabled={isLoading}
//                         >
//                             {isLoading ? "Connexion..." : "Open the doors, HAL !"}
//                         </Button>
//                     </form>
//                 </CardContent>
//             </Card>

//             {/* Quote section */}
//             {quote && (
//                 <div className="text-center">
//                     <div className="text-gray-600 text-sm italic max-w-md mx-auto">
//                         "{quote.citation}"
//                         <div className="text-gray-500 font-medium text-xs mt-2">- {quote.auteur}</div>
//                     </div>
//                 </div>
//             )}

//             {/* Password Reset Modal */}
//             <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
//                 <DialogContent>
//                     <DialogHeader>
//                         <DialogTitle>Renvoyer le mot de passe</DialogTitle>
//                     </DialogHeader>
//                     <div className="space-y-4">
//                         <div>
//                             <Input
//                                 type="email"
//                                 placeholder="Entrez votre email"
//                                 value={email}
//                                 onChange={(e) => setEmail(e.target.value)}
//                             />
//                         </div>
//                         <div className="flex justify-end space-x-2">
//                             <Button 
//                                 variant="outline" 
//                                 onClick={() => setIsModalOpen(false)}
//                                 disabled={isLoading}
//                             >
//                                 Fermer
//                             </Button>
//                             <Button 
//                                 onClick={async () => {
//                                     if (!email) {
//                                         toast({
//                                             title: "Erreur",
//                                             description: "Veuillez saisir votre email",
//                                             variant: "destructive",
//                                         });
//                                         return;
//                                     }

//                                     setIsLoading(true);
//                                     try {
//                                         const response = await fetch('/api/auth/forgot-password', {
//                                             method: 'POST',
//                                             headers: {
//                                                 'Content-Type': 'application/json'
//                                             },
//                                             body: JSON.stringify({ email })
//                                         });

//                                         if (!response.ok) {
//                                             const errorData = await response.json();
//                                             toast({
//                                                 title: "Erreur",
//                                                 description: errorData.message || "Aucun compte trouvé avec cet email",
//                                                 variant: "destructive",
//                                             });
//                                             return;
//                                         }

//                                         toast({
//                                             title: "Succès",
//                                             description: "Un email contenant votre mot de passe a été envoyé",
//                                         });
//                                         setIsModalOpen(false);
//                                     } catch (error) {
//                                         toast({
//                                             title: "Erreur",
//                                             description: "Une erreur est survenue lors de la réinitialisation",
//                                             variant: "destructive",
//                                         });
//                                     } finally {
//                                         setIsLoading(false);
//                                     }
//                                 }}
//                                 disabled={isLoading}
//                             >
//                                 {isLoading ? "Envoi..." : "Envoyer"}
//                             </Button>
//                         </div>
//                     </div>
//                 </DialogContent>
//             </Dialog>
//         </div>
//     );
// }
