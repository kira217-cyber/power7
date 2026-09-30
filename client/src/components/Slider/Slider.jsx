import React from "react";
import { useNavigate } from "react-router";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

import { useIsDesktop } from "../../hook/useIsDesktop";
import { m } from "../../hook/useUnits";
import { followLink } from "../../utils/siteLink";

/**
 * হোমের ব্যানার স্লাইডার।
 *
 * মূল সাইট থেকে মাপা:
 *   `.page-banner` ১০৮৫ × ৩৭০.৭, ছবির radius ১০
 *   পেজিনেশন — গোল বিন্দু নয়, **সরু বার**: প্রতিটা ৪৭.৬ × ৬,
 *     radius ০; নিষ্ক্রিয় rgba(195,204,213,.48), সক্রিয় #DA394F
 *     পুরো সারি ৫০০ চওড়া, কলামের মাঝে (x+২৯২.৫), নিচ থেকে y+৩৫২.৭
 *   মোবাইলে ব্যানার ৩৯০ × ১৫৬ (৭৫০-ডিজাইনে ৩০০ উঁচু)
 */
const Slider = ({ banners = [] }) => {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  if (!banners.length) return null;

  return (
    <div
      // মোবাইলে পেজিনেশন গোল সাদা বিন্দু (১৮), ডেস্কটপে সরু বার
      className={isDesktop ? "tb-banner" : "tb-banner-m"}
      style={{
        // `.home-banner` মোবাইলে ৭৫০ × ৩০০ (ডিজাইন ইউনিট) = ৩rem
        height: isDesktop ? "var(--banner-h)" : m(300),
        borderRadius: isDesktop ? "var(--banner-radius)" : 0,
        overflow: "hidden",
      }}
    >
      <Swiper
        modules={[Autoplay, Pagination]}
        loop={banners.length > 1}
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        className="h-full w-full"
      >
        {banners.map((banner, index) => (
          <SwiperSlide key={index}>
            <img
              src={banner.image}
              alt={banner.title || ""}
              className="h-full w-full"
              onClick={() => followLink(banner.link, navigate)}
              style={{ objectFit: "cover", display: "block", cursor: banner.link ? "pointer" : "default" }}
              loading={index === 0 ? "eager" : "lazy"}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default Slider;
