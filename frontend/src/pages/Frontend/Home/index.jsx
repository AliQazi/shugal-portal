import Login from '../../Auth/Login'
import HeroSection from '../../../components/HeroSection'
import CommonSections from '../../../components/CommonSections'

export default function Home({ user, onLogin }) {
    return (
        <>
            {user ? <HeroSection /> : <Login onLogin={onLogin} />}
            <CommonSections />
        </>
    )
}