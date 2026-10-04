import HeroSection from '../../../components/HeroSection'
import CommonSections from '../../../components/CommonSections'
import HomeIntro from '../../../components/HomeIntro'
import './home.css'

export default function Home({ user }) {
    return (
        <div className="home-page">
            <HomeIntro user={user} />
            <HeroSection isGuest={!user} />
            <CommonSections />
        </div>
    )
}
