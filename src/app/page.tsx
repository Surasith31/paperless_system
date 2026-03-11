"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center py-12 px-4 md:px-6">
      <div className="max-w-6xl mx-auto text-center">
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-8 md:mb-12"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="p-4 md:p-6 bg-white rounded-3xl shadow-xl ring-1 ring-gray-200">
            <Image
              src="/logo.png"
              alt="Logo"
              width={100}
              height={100}
              className="object-contain"
            />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 md:mb-6 tracking-tight"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          Paperless System
        </motion.h1>

        <motion.p
          className="text-base sm:text-lg md:text-xl text-gray-600 mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
        >
          ระบบจัดการเอกสารออนไลน์ สะดวก รวดเร็ว และปลอดภัย
        </motion.p>

        {/* CTA */}
        <motion.div
          className="flex justify-center mb-16"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Link href="/page/login" prefetch={true} className="cursor-pointer">
            <motion.button
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.1 }}
              className="relative px-8 py-4 rounded-xl text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg flex items-center gap-3 overflow-hidden cursor-pointer hover:shadow-xl active:shadow-lg"
            >
              <span className="absolute inset-0 bg-white/20 blur-xl opacity-0 hover:opacity-20 transition-opacity duration-300"></span>
              เข้าสู่ระบบ
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </motion.div>

        {/* Features */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 text-left"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.2, delayChildren: 0.8 },
            },
          }}
        >
          {[
            {
              title: "📄 จัดการเอกสาร",
              desc: "อัพโหลด จัดเก็บ และค้นหาเอกสารได้อย่างรวดเร็วและง่ายดาย",
            },
            {
              title: "✅ อนุมัติออนไลน์",
              desc: "ส่งเอกสารเพื่ออนุมัติได้ทุกที่ทุกเวลา ลดเวลาการทำงานซ้ำซ้อน",
            },
            {
              title: "🔒 ปลอดภัย",
              desc: "ปกป้องข้อมูลด้วยการเข้ารหัสและสิทธิ์การเข้าถึงตามบทบาท",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              className="p-6 md:p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300"
              variants={{
                hidden: { y: 30, opacity: 0 },
                show: { y: 0, opacity: 1 },
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h3 className="font-semibold text-gray-900 mb-3 text-lg md:text-xl">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p
          className="mt-16 md:mt-20 text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          © {new Date().getFullYear()} Paperless System. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
}
