"use client";

import { motion } from "framer-motion";
import { Star, Users, Award, Clock, Heart, MapPin } from "lucide-react";

export default function About() {
  const stats = [
    { icon: <Users className="w-8 h-8" />, value: "50,000+", label: "Happy Customers" },
    { icon: <Star className="w-8 h-8" />, value: "4.9", label: "Average Rating" },
    { icon: <Clock className="w-8 h-8" />, value: "25min", label: "Average Delivery" },
    { icon: <Award className="w-8 h-8" />, value: "100+", label: "Partner Restaurants" },
  ];

  const team = [
    {
      name: "YOUB Mahmoud Nader",
      role: "Founder & CEO",
      image: "👨‍💼",
      description: "Passionate about bringing authentic Algerian cuisine to everyone"
    },
    {
      name: "BENDALI-BRAHAM Aya Manar",
      role: "Head Chef Consultant",
      image: "👩‍🍳",
      description: "Expert in traditional Algerian recipes"
    },
    {
      name: "BOUMEHDI Rym",
      role: "Product Lead",
      image: "👩‍💻",
      description: "Ensuring a seamless experience for our users"
    }
  ];

  const values = [
    {
      icon: <Heart className="w-12 h-12" />,
      title: "Authenticity",
      description: "We preserve the genuine flavors and traditions of Algerian cuisine"
    },
    {
      icon: <Users className="w-12 h-12" />,
      title: "Community",
      description: "Supporting local restaurants and connecting communities through food"
    },
    {
      icon: <Award className="w-12 h-12" />,
      title: "Quality",
      description: "Only the finest ingredients and highest cooking standards"
    }
  ];

  return (
    <div className="min-h-screen pt-20 pb-12">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 font-poppins">
              About <span className="text-gradient">Tbib El Jou3</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Founded with a passion for authentic Algerian cuisine, Tbib El Jou3 connects 
              food lovers with the rich culinary heritage of Algeria. We believe that great 
              food brings people together and tells the story of our culture.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary">Our Story</button>
              <button className="btn-outline">Join Our Mission</button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-terracotta rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Tbib El Jou3 was born from a simple joke: with my friends, we were looking for
                  a name for a projec...a name that sounds algerian...a name that's so iconic that everyone
                  will be talking about it, AND, tbib el jou3 view the day.
                </p>
                <p>
                  The idea quickly evolved into a mission to connect people with the rich culinary
                  traditions of Algeria. We started small, partnering with local restaurants to
                  bring their authentic dishes to a wider audience.
                </p>
                <p>
                  Today, we aim to work with over 100 partner restaurants and have delivered millions 
                  of meals to happy customers across Algeria. Every dish tells a story, and 
                  we're proud to be part of that narrative.
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="glass-card p-8 text-center">
                <div className="text-8xl mb-4">🥘</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Traditional Recipes</h3>
                <p className="text-gray-600">
                  Passed down through generations, our partner restaurants use authentic 
                  recipes that have been perfected over centuries.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              These principles guide everything we do at Tbib El Jou3
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="glass-card p-8 text-center card-hover"
              >
                <div className="text-primary mb-6">{value.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The passionate people behind Tbib El Jou3
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="glass-card p-6 text-center card-hover"
              >
                <div className="text-6xl mb-4">{member.image}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
                <p className="text-primary font-semibold mb-3">{member.role}</p>
                <p className="text-gray-600 text-sm">{member.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-terracotta text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-6">Join Our Journey</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
              Be part of our mission to share authentic Algerian cuisine with the world
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-primary px-8 py-3 rounded-2xl font-semibold hover:shadow-lg transition-all">
                Become a Partner
              </button>
              <button className="border-2 border-white text-white px-8 py-3 rounded-2xl font-semibold hover:bg-white hover:text-primary transition-all">
                Contact Us
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}