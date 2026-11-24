
import { useState } from "react";
import {
    BadgeCheck,
    Music2,
    
  Mail,
    MessageCircle,
    ArrowLeft,
    CheckCircle,
} from "lucide-react";

import "./FreeVerification.css";

const WHATSAPP_NUMBER = "265881057210";
const VERIFICATION_EMAIL = "tedalexander202@gmail.com";

export default function FreeVerification() {

    const [form, setForm] = useState({
        fullName: "",
        artistName: "",
        username: "",
        country: "",
        genre: "",
        reason: "",
        instagram: "",
        facebook: "",
        youtube: "",
    });

    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        if (error) setError("");
    };
const handleEmailSubmit = () => {

    if (
        !form.fullName.trim() ||
        !form.artistName.trim() ||
        !form.username.trim() ||
        !form.country.trim() ||
        !form.genre.trim() ||
        !form.reason.trim()
    ) {
        setError("Please complete all required fields.");
        return;
    }

    const subject = encodeURIComponent(
        `Free Artist Verification Application - ${form.artistName}`
    );

    const body = encodeURIComponent(`
CAVE TUNES - FREE VERIFICATION APPLICATION

Full Name: ${form.fullName}
Artist Name: ${form.artistName}
Cave Tunes Username: @${form.username.replace(/^@/, "")}
Country: ${form.country}
Music Genre: ${form.genre}

Why I want verification:
${form.reason}

SOCIAL MEDIA LINKS

Instagram: ${form.instagram || "Not provided"}
Facebook: ${form.facebook || "Not provided"}
YouTube: ${form.youtube || "Not provided"}

I would like to apply for FREE ARTIST VERIFICATION on Cave Tunes.

Thank you!
    `);

    window.location.href =
        `mailto:${VERIFICATION_EMAIL}?subject=${subject}&body=${body}`;
};
    const handleSubmit = (e) => {
        e.preventDefault();

        if (
            !form.fullName.trim() ||
            !form.artistName.trim() ||
            !form.username.trim() ||
            !form.country.trim() ||
            !form.genre.trim() ||
            !form.reason.trim()
        ) {
            setError("Please complete all required fields.");
            return;
        }

        const message = `
🎵 CAVE TUNES - FREE VERIFICATION APPLICATION

👤 Full Name: ${form.fullName}
🎤 Artist Name: ${form.artistName}
🔗 Cave Tunes Username: @${form.username.replace(/^@/, "")}
🌍 Country: ${form.country}
🎶 Music Genre: ${form.genre}

📝 Why I want verification:
${form.reason}

📱 SOCIAL MEDIA LINKS

Instagram: ${form.instagram || "Not provided"}
Facebook: ${form.facebook || "Not provided"}
YouTube: ${form.youtube || "Not provided"}

I would like to apply for FREE ARTIST VERIFICATION on Cave Tunes.

Thank you!
        `.trim();

        const whatsappURL =
            `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

        window.location.href = whatsappURL;
    };

    return (
        <div className="free-verification-page">

            <header className="verification-header">

                <button
                    className="verification-back"
                    type="button"
                    onClick={() => window.history.back()}
                >
                    <ArrowLeft size={19} />
                    Back
                </button>

                <div className="verification-brand">
                    <Music2 size={25} />
                    <span>CAVE TUNES</span>
                </div>

            </header>


            <main className="verification-container">

                <section className="verification-hero">

                    <div className="verification-icon">
                        <BadgeCheck size={43} />
                    </div>

                    <span className="verification-free-label">
                        100% FREE
                    </span>

                    <h1>
                        Get Your <span>Verified Badge</span>
                    </h1>

                    <p>
                        Are you an artist? Apply for free verification
                        on Cave Tunes and let your fans recognize
                        your official artist profile.
                    </p>

                    <div className="verification-benefits">

                        <div>
                            <CheckCircle size={17} />
                            Free application
                        </div>

                        <div>
                            <CheckCircle size={17} />
                            Official artist identity
                        </div>

                        <div>
                            <CheckCircle size={17} />
                            Reviewed by Cave Tunes
                        </div>

                    </div>

                </section>


                <form
                    className="verification-form"
                    onSubmit={handleSubmit}
                >

                    <div className="verification-form-heading">

                        <div>
                            <h2>Artist Application</h2>
                            <p>Fill in your details below.</p>
                        </div>

                        <BadgeCheck size={30} />

                    </div>


                    {error && (
                        <div className="verification-error">
                            {error}
                        </div>
                    )}


                    <div className="verification-fields">

                        <div className="verification-field">
                            <label>Full Name *</label>

                            <input
                                name="fullName"
                                value={form.fullName}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>


                        <div className="verification-field">
                            <label>Artist / Stage Name *</label>

                            <input
                                name="artistName"
                                value={form.artistName}
                                onChange={handleChange}
                                placeholder="Your artist name"
                                required
                            />
                        </div>


                        <div className="verification-field">
                            <label>Cave Tunes Username *</label>

                            <input
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                placeholder="@yourusername"
                                required
                            />
                        </div>


                        <div className="verification-field">
                            <label>Country *</label>

                            <input
                                name="country"
                                value={form.country}
                                onChange={handleChange}
                                placeholder="Your country"
                                required
                            />
                        </div>


                        <div className="verification-field">
                            <label>Music Genre *</label>

                            <input
                                name="genre"
                                value={form.genre}
                                onChange={handleChange}
                                placeholder="e.g. Afrobeat, Hip Hop, R&B"
                                required
                            />
                        </div>


                        <div className="verification-field verification-full">
                            <label>Why should we verify you? *</label>

                            <textarea
                                name="reason"
                                value={form.reason}
                                onChange={handleChange}
                                placeholder="Tell us about yourself, your music career and your audience..."
                                rows="5"
                                required
                            />
                        </div>

                    </div>


                    <div className="verification-social-heading">
                        <h3>Social Media Profiles</h3>
                        <span>Optional</span>
                    </div>


                    <div className="verification-fields">

                        <div className="verification-field">
                            <label>
                              
                                Instagram
                            </label>

                            <input
                                name="instagram"
                                value={form.instagram}
                                onChange={handleChange}
                                placeholder="Instagram profile URL"
                            />
                        </div>


                        <div className="verification-field">
                           <label>
    Facebook
</label>

                            <input
                                name="facebook"
                                value={form.facebook}
                                onChange={handleChange}
                                placeholder="Facebook profile URL"
                            />
                        </div>


                        <div className="verification-field verification-full">
                            <label>
                            
                                YouTube
                            </label>

                            <input
                                name="youtube"
                                value={form.youtube}
                                onChange={handleChange}
                                placeholder="YouTube channel URL"
                            />
                        </div>

                    </div>


                    <div className="verification-notice">
                        <BadgeCheck size={21} />

                        <p>
                            Your application is completely free.
                            Our team will review your information
                            and get back to you.
                        </p>
                    </div>


                    <button
                        type="submit"
                        className="verification-submit"
                    >
                        <MessageCircle size={21} />
                        Submit Application via WhatsApp
                    </button>
<button
    type="button"
    className="verification-email-submit"
    onClick={handleEmailSubmit}
>
    <Mail size={21} />
    Submit Application via Email
</button>

                    <p className="verification-footer">
                        By submitting, you agree that Cave Tunes
                        may review the information you provide.
                    </p>

                </form>

            </main>

        </div>
    );
}
