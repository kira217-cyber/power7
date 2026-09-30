import React from "react";

import Hero from "../../components/Hero/Hero";
import Stats from "../../components/Stats/Stats";
import Commission from "../../components/Commission/Commission";
import HowItWorks from "../../components/HowItWorks/HowItWorks";
import WhyUs from "../../components/WhyUs/WhyUs";
import Providers from "../../components/Providers/Providers";
import Faq from "../../components/Faq/Faq";
import CtaBand from "../../components/CtaBand/CtaBand";

/** অ্যাফিলিয়েট ল্যান্ডিং পেজ */
const Home = () => {
  return (
    <>
      <Hero />
      <Stats />
      <Commission />
      <HowItWorks />
      <WhyUs />
      <Providers />
      <Faq />
      <CtaBand />
    </>
  );
};

export default Home;
