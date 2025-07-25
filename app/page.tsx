import LoginForm from '../components/LoginForm'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="flex min-h-screen bg-gray-50">
      <div className="absolute top-4 left-4">
        <Image src="/logo_bbl-groupe.svg" alt="Logo" width={120} height={40} />
      </div>
      <div className="flex items-center justify-center w-full h-full">
        <LoginForm />
      </div>
    </main>
  )
}
