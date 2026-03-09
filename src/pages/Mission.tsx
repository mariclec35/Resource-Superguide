import React, { useEffect } from 'react';
import { motion } from 'motion/react';

export default function Mission() {
  useEffect(() => {
    document.title = "Our Mission | Twin Cities Recovery Hub";
    window.scrollTo(0, 0);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Offset for sticky nav
      const y = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const sections = [
    { id: 'why-this-matters', title: 'Why This Matters' },
    { id: 'what-we-do', title: 'What We Do' },
    { id: 'who-we-serve', title: 'Who We Serve' },
    { id: 'twin-cities-focus', title: 'Twin Cities Focus' },
    { id: 'community-first', title: 'Community First' },
    { id: 'supporting-organizations', title: 'Supporting Organizations' },
  ];

  const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-white text-zinc-800 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 px-4 overflow-hidden bg-gradient-to-b from-emerald-50/80 via-emerald-50/20 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 mb-8 leading-[1.1]">
              Our Mission
            </h1>
            <p className="text-2xl md:text-3xl font-medium text-emerald-900/80 leading-snug max-w-3xl mx-auto mb-12">
              Making recovery resources easier to find, easier to trust, and easier to use for people in Minneapolis, Saint Paul, and surrounding communities.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Intro / Mission Statement */}
      <section className="px-4 pb-16 md:pb-24 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <p className="text-xl md:text-2xl text-zinc-600 leading-relaxed mb-8">
              Recovery support already exists across the Twin Cities through meetings, treatment programs, sober housing, community organizations, events, and peer networks. The problem is not that help is missing. The problem is that it is often scattered across different places, hard to search, and difficult to navigate when someone needs it most.
            </p>
            <p className="text-xl md:text-2xl text-zinc-900 font-medium leading-relaxed">
              Our mission is to bring those resources together in one place so individuals, families, and professionals can more easily find support, stay connected, and move forward.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Jump Navigation */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-y border-zinc-200/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex overflow-x-auto hide-scrollbar py-4 gap-8 md:justify-center">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="whitespace-nowrap text-sm font-medium text-zinc-500 hover:text-emerald-700 transition-colors"
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="flex flex-col">
        
        {/* Why This Matters */}
        <section id="why-this-matters" className="scroll-mt-16 py-16 md:py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
                <div className="md:w-1/3 shrink-0">
                  <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">Why This Matters</h2>
                </div>
                <div className="md:w-2/3 prose prose-lg prose-zinc text-zinc-600 leading-relaxed">
                  <p>For many people, asking for help is already hard enough. Finding that help should not be another barrier.</p>
                  <p>When meetings, programs, and services are difficult to locate, people can lose time, feel overwhelmed, or miss support during important moments. Twin Cities Recovery Hub was created to reduce that friction by making recovery information easier to access and easier to understand.</p>
                  <blockquote className="border-l-2 border-emerald-500 pl-6 my-8 italic text-zinc-800 font-medium text-xl md:text-2xl leading-snug">
                    "Sometimes the right meeting, program, or resource at the right time can make a life-changing difference."
                  </blockquote>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* What We Do */}
        <section id="what-we-do" className="scroll-mt-16 py-16 md:py-24 bg-emerald-50/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
                <div className="md:w-1/3 shrink-0">
                  <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">What We Do</h2>
                </div>
                <div className="md:w-2/3 prose prose-lg prose-zinc text-zinc-600 leading-relaxed">
                  <p>Twin Cities Recovery Hub is being built as a central place for recovery-related information in the Twin Cities.</p>
                  <p>The platform is focused on:</p>
                  <ul className="space-y-4 my-8 list-none pl-0">
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>Making local recovery resources easier to discover</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>Helping people find meetings and recovery events</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>Improving visibility for organizations and programs serving the community</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>Creating a more connected recovery ecosystem across the Twin Cities</span>
                    </li>
                  </ul>
                  <p className="font-medium text-zinc-900 text-xl mt-8">
                    The goal is simple: help people spend less time searching and more time finding support.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Who We Serve */}
        <section id="who-we-serve" className="scroll-mt-16 py-16 md:py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
                <div className="md:w-1/3 shrink-0">
                  <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">Who We Serve</h2>
                </div>
                <div className="md:w-2/3 prose prose-lg prose-zinc text-zinc-600 leading-relaxed">
                  <p>Twin Cities Recovery Hub is designed to support:</p>
                  <ul className="space-y-4 my-8 list-none pl-0">
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>Individuals seeking recovery support</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>People already in recovery who want to stay connected</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>Family members and loved ones looking for help</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>Treatment programs and recovery organizations</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>Community members, peer networks, and service providers</span>
                    </li>
                  </ul>
                  <p className="font-medium text-zinc-900 text-xl mt-8">
                    This platform is meant to serve real people with real needs in everyday situations.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Twin Cities Focus */}
        <section id="twin-cities-focus" className="scroll-mt-16 py-16 md:py-24 bg-emerald-50/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
                <div className="md:w-1/3 shrink-0">
                  <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">Twin Cities Focus</h2>
                </div>
                <div className="md:w-2/3 prose prose-lg prose-zinc text-zinc-600 leading-relaxed">
                  <p>This platform is built specifically for the recovery community in Minneapolis, Saint Paul, and the surrounding area.</p>
                  <p>The Twin Cities has a strong recovery community made up of people, organizations, and programs working every day to support others. Twin Cities Recovery Hub is meant to strengthen those connections by making local support easier to find and easier to share.</p>
                  <blockquote className="border-l-2 border-emerald-500 pl-6 my-8 italic text-zinc-800 font-medium text-xl md:text-2xl leading-snug">
                    "This is a local platform with a local purpose: helping people in this community connect to the help that already exists here."
                  </blockquote>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Community First */}
        <section id="community-first" className="scroll-mt-16 py-16 md:py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
                <div className="md:w-1/3 shrink-0">
                  <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">Community First</h2>
                </div>
                <div className="md:w-2/3 prose prose-lg prose-zinc text-zinc-600 leading-relaxed">
                  <p>Twin Cities Recovery Hub is built with one priority in mind: supporting the recovery community.</p>
                  <p>The platform is not meant to replace the work already being done by treatment centers, meetings, recovery groups, or community organizations. Its purpose is to help make those resources easier for people to find.</p>
                  <p>We are committed to keeping the platform:</p>
                  <ul className="space-y-4 my-8 list-none pl-0">
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>Community-focused</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>Easy to use</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>Accurate and helpful</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                      <span>Centered on access to support</span>
                    </li>
                  </ul>
                  <p className="font-medium text-zinc-900 text-xl mt-8">
                    Everything about the platform should make it easier for people to take the next step toward help.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Supporting Organizations */}
        <section id="supporting-organizations" className="scroll-mt-16 py-16 md:py-24 bg-emerald-50/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
                <div className="md:w-1/3 shrink-0">
                  <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">Supporting Organizations</h2>
                </div>
                <div className="md:w-2/3 prose prose-lg prose-zinc text-zinc-600 leading-relaxed">
                  <p>Twin Cities Recovery Hub is also designed to support the organizations, programs, and groups that serve the recovery community.</p>
                  <p>By giving local organizations a stronger public presence and making their meetings, services, and events easier to find, the platform helps connect more people to the support already available.</p>
                  <blockquote className="border-l-2 border-emerald-500 pl-6 my-8 italic text-zinc-800 font-medium text-xl md:text-2xl leading-snug">
                    "The long-term goal is to strengthen the overall recovery ecosystem by improving visibility, connection, and access across the Twin Cities."
                  </blockquote>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

      </div>

      {/* Closing Footer */}
      <section className="bg-white py-16 md:py-24 px-4 border-t border-zinc-100">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight text-zinc-900">Twin Cities Recovery Hub</h3>
            <p className="text-lg text-zinc-500 font-medium max-w-2xl mx-auto leading-relaxed">
              Exists to help people find support, stay connected, and keep moving forward.
            </p>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-12 inline-flex items-center gap-2 text-zinc-400 hover:text-emerald-600 transition-colors font-medium text-sm uppercase tracking-wider"
            >
              Back to top &uarr;
            </button>
          </FadeIn>
        </div>
      </section>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
