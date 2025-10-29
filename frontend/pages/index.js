import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: '🎯',
      title: 'AI-Powered Matching',
      description: 'Our intelligent algorithm analyzes your skills and matches you with the perfect job opportunities.',
      color: '#667eea'
    },
    {
      icon: '📝',
      title: 'Smart Resume Generator',
      description: 'Create tailored, professional resumes for each job application in seconds using AI.',
      color: '#764ba2'
    },
    {
      icon: '⚡',
      title: 'One-Click Apply',
      description: 'Apply to multiple jobs effortlessly with our Smart Apply Helper that auto-fills your information.',
      color: '#f093fb'
    }
  ];

  const stats = [
    { number: '10K+', label: 'Job Listings' },
    { number: '95%', label: 'Match Accuracy' },
    { number: '2x', label: 'Faster Applications' },
    { number: '24/7', label: 'AI Support' }
  ];

  const problems = [
    {
      icon: '😫',
      title: 'Endless Job Scrolling',
      description: 'Spending hours browsing through irrelevant job postings that don\'t match your skills.',
      solution: 'Our AI filters and ranks jobs specifically matched to your profile.'
    },
    {
      icon: '📄',
      title: 'Resume Customization Nightmare',
      description: 'Manually tailoring your resume for each application is time-consuming and exhausting.',
      solution: 'Generate customized, professional resumes in seconds with our AI Resume Generator.'
    },
    {
      icon: '⌨️',
      title: 'Repetitive Form Filling',
      description: 'Typing the same information over and over again for every job application.',
      solution: 'Smart Apply Helper auto-fills all your details with a single click.'
    }
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Sign Up & Set Preferences',
      description: 'Create your account and tell us about your skills, experience, and job preferences.',
      icon: '👤'
    },
    {
      step: '2',
      title: 'AI Finds Perfect Matches',
      description: 'Our intelligent algorithm scans thousands of jobs and finds the best matches for you.',
      icon: '🔍'
    },
    {
      step: '3',
      title: 'Generate Tailored Resumes',
      description: 'Create professional, job-specific resumes instantly with our AI-powered generator.',
      icon: '✨'
    },
    {
      step: '4',
      title: 'Apply with One Click',
      description: 'Use Smart Apply to fill forms automatically and apply to jobs in seconds.',
      icon: '🚀'
    }
  ];

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        boxShadow: scrolled ? '0 2px 20px rgba(0, 0, 0, 0.1)' : 'none',
        transition: 'all 0.3s ease',
        padding: '20px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '28px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            💼 HireFlow
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '10px 24px',
                background: 'transparent',
                border: '2px solid #667eea',
                borderRadius: '8px',
                color: '#667eea',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#667eea';
                e.target.style.color = 'white';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#667eea';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/signup')}
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '150px 20px 100px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background shapes */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '600px',
          height: '600px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: 'float 20s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-5%',
          width: '400px',
          height: '400px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: 'float 15s ease-in-out infinite reverse'
        }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h1 style={{
              fontSize: '56px',
              fontWeight: 'bold',
              marginBottom: '20px',
              animation: 'fadeInUp 1s ease-out',
              lineHeight: '1.2'
            }}>
              Find Your Dream Job with<br />AI-Powered Precision
            </h1>
            <p style={{
              fontSize: '22px',
              marginBottom: '40px',
              opacity: 0.95,
              animation: 'fadeInUp 1s ease-out 0.2s backwards',
              maxWidth: '700px',
              margin: '0 auto 40px'
            }}>
              Stop wasting time on irrelevant applications. Let our intelligent AI match you with perfect opportunities and streamline your job search.
            </p>
            <div style={{
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
              animation: 'fadeInUp 1s ease-out 0.4s backwards',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => router.push('/signup')}
                style={{
                  padding: '16px 40px',
                  background: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#667eea',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
                }}
              >
                Start Free Today 🚀
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  padding: '16px 40px',
                  background: 'transparent',
                  border: '2px solid white',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                See How It Works
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '30px',
            marginTop: '80px',
            animation: 'fadeInUp 1s ease-out 0.6s backwards'
          }}>
            {stats.map((stat, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  padding: '30px',
                  borderRadius: '16px',
                  textAlign: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.transform = 'translateY(-5px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {stat.number}
                </div>
                <div style={{ fontSize: '16px', opacity: 0.9 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problems We Solve */}
      <section style={{ padding: '100px 20px', background: '#f8f9fa' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: '42px',
              fontWeight: 'bold',
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              We Solve Your Job Search Headaches
            </h2>
            <p style={{ fontSize: '18px', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
              Traditional job hunting is broken. We've built the solution.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
            {problems.map((problem, index) => (
              <div
                key={index}
                style={{
                  background: 'white',
                  padding: '40px',
                  borderRadius: '20px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.4s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>{problem.icon}</div>
                <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#1e293b' }}>
                  {problem.title}
                </h3>
                <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '20px', lineHeight: '1.6' }}>
                  {problem.description}
                </p>
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, #f0f4ff 0%, #e9e4ff 100%)',
                  borderRadius: '12px',
                  borderLeft: '4px solid #667eea'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#667eea', marginBottom: '6px' }}>
                    ✅ Our Solution:
                  </div>
                  <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                    {problem.solution}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section style={{ padding: '100px 20px', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: '42px',
              fontWeight: 'bold',
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Powerful Features Built for Success
            </h2>
            <p style={{ fontSize: '18px', color: '#64748b' }}>
              Everything you need to land your dream job, powered by AI
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            {features.map((feature, index) => (
              <div
                key={index}
                style={{
                  background: index === activeFeature ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                  padding: '40px',
                  borderRadius: '20px',
                  boxShadow: index === activeFeature ? '0 12px 40px rgba(102, 126, 234, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.5s ease',
                  cursor: 'pointer',
                  border: index === activeFeature ? 'none' : '2px solid #f1f5f9',
                  transform: index === activeFeature ? 'scale(1.05)' : 'scale(1)'
                }}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div style={{
                  fontSize: '48px',
                  marginBottom: '20px',
                  filter: index === activeFeature ? 'brightness(2)' : 'none'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                  color: index === activeFeature ? 'white' : '#1e293b'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '16px',
                  color: index === activeFeature ? 'rgba(255, 255, 255, 0.9)' : '#64748b',
                  lineHeight: '1.6'
                }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: '100px 20px', background: '#f8f9fa' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: '42px',
              fontWeight: 'bold',
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              How HireFlow Works
            </h2>
            <p style={{ fontSize: '18px', color: '#64748b' }}>
              Get started in 4 simple steps
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px' }}>
            {howItWorks.map((item, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <div style={{
                  background: 'white',
                  padding: '40px 30px',
                  borderRadius: '20px',
                  textAlign: 'center',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                }}
                >
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: '32px',
                    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)'
                  }}>
                    {item.icon}
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    left: '-15px',
                    width: '40px',
                    height: '40px',
                    background: '#667eea',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '18px'
                  }}>
                    {item.step}
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#1e293b' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6' }}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '100px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '800px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          animation: 'pulse 4s ease-in-out infinite'
        }} />
        
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: 'white'
          }}>
            Ready to Transform Your Job Search?
          </h2>
          <p style={{
            fontSize: '20px',
            marginBottom: '40px',
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: '1.6'
          }}>
            Join thousands of job seekers who have found their dream jobs with HireFlow. Start your journey today, absolutely free!
          </p>
          <button
            onClick={() => router.push('/signup')}
            style={{
              padding: '18px 50px',
              background: 'white',
              border: 'none',
              borderRadius: '12px',
              color: '#667eea',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-5px) scale(1.05)';
              e.target.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.2)';
            }}
          >
            Get Started for Free →
          </button>
          <p style={{
            marginTop: '20px',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            No credit card required • Free forever • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#1e293b', color: 'white', padding: '60px 20px 30px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '40px',
            marginBottom: '40px'
          }}>
            <div>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                💼 HireFlow
              </div>
              <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '14px' }}>
                Revolutionizing job search with AI-powered matching, smart resume generation, and effortless application management.
              </p>
            </div>
            
            <div>
              <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Product</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Features', 'How It Works', 'Pricing', 'FAQ'].map((item) => (
                  <li key={item} style={{ marginBottom: '12px' }}>
                    <a href="#" style={{
                      color: '#94a3b8',
                      textDecoration: 'none',
                      fontSize: '14px',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'white'}
                    onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Company</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['About Us', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item} style={{ marginBottom: '12px' }}>
                    <a href="#" style={{
                      color: '#94a3b8',
                      textDecoration: 'none',
                      fontSize: '14px',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'white'}
                    onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Connect</h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['📘', '🐦', '💼', '📸'].map((icon, index) => (
                  <a
                    key={index}
                    href="#"
                    style={{
                      width: '40px',
                      height: '40px',
                      background: '#334155',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      transition: 'all 0.3s ease',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#667eea';
                      e.target.style.transform = 'translateY(-3px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#334155';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid #334155',
            paddingTop: '30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
              © 2025 HireFlow. All rights reserved.
            </p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
                <a
                  key={item}
                  href="#"
                  style={{
                    color: '#94a3b8',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'white'}
                  onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-30px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}

