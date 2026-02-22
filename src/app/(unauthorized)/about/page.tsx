'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const AboutPage = () =>
{
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Wait for client mount to avoid SSR mismatch
    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted)
    {
        return
          <Button variant="outline" size="icon" className="absolute top-4 right-4" disabled>
            <div className="h-5 w-5" />
          </Button>
    }

    return (
<div className="min-h-screen flex items-center justify-center px-8 relative" >

  { /* logo */ }
  <div className="absolute top-4 left-4 z-20">
    <img
      src="/compliance-circle-logo.png"
      alt="Company Logo"
      className="h-20 w-auto"
    />
  </div>

  <div className="w-full max-w-2xl">

    <Button
        variant="outline"
        size="icon"
        className="absolute top-4 right-4"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        { theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
        ) }
    </Button>

    <h1 className='font-playfair font-light text-3xl mb-4'>About Compliance Circle</h1>

    <div className="flex items-center gap-3 justify-between">
      <p className="text-sm text-gray-600 whitespace-nowrap">
        Copenhagen, Denmark
      </p>

      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Language</SelectLabel>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="da">Dansk</SelectItem>
            <SelectItem value="zh-CN">简体中文</SelectItem>
            <SelectItem value="zh-TW">繁體中文</SelectItem>
            <SelectItem value="ja">日本語</SelectItem>
            <SelectItem value="ru">Русский</SelectItem>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="it">Italiano</SelectItem>
            <SelectItem value="de">Deutsch</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <hr className="my-8" />

    <p className='font-playfair font-light mb-4 italic px-16'>"Simplifying compliance, so you can focus on what matters."</p>

    <h2 className='font-playfair font-light text-xl mb-3 mt-8'>Who We Are</h2>
    <p className='font-playfair font-light mb-4'>Compliance Circle is a Danish company dedicated to helping organisations manage their compliance obligations with clarity and confidence. Based in Copenhagen, Denmark, we operate within the European Union and build our solutions with European data protection standards at the core.</p>

    <h2 className='font-playfair font-light text-xl mb-3 mt-8'>What We Do</h2>
    <p className='font-playfair font-light mb-4'>We provide a compliance management platform that enables organisations to track tasks, manage documentation, maintain audit trails, and ensure accountability across their compliance workflows. Our platform is designed for teams that need to demonstrate adherence to regulatory frameworks, internal policies, and industry standards.</p>

    <p className='font-playfair font-light mb-4'>With Compliance Circle, organisations can assign tasks to team members, attach and manage evidentiary artifacts, track progress through structured workflows, and maintain a complete, immutable record of all compliance activities.</p>

    <h2 className='font-playfair font-light text-xl mb-3 mt-8'>Our Mission</h2>
    <p className='font-playfair font-light mb-4'>Compliance should not be a burden. Our mission is to make compliance management accessible, transparent, and efficient for organisations of all sizes. We believe that well-organised compliance processes lead to better governance, reduced risk, and stronger trust between organisations and their stakeholders.</p>

    <h2 className='font-playfair font-light text-xl mb-3 mt-8'>Our Values</h2>
    <p className='font-playfair font-light mb-4'><strong>Transparency</strong> &mdash; We believe in open, auditable processes. Every action within our platform is traceable and accountable.</p>
    <p className='font-playfair font-light mb-4'><strong>Privacy</strong> &mdash; As a European company, we are committed to the highest standards of data protection. We comply fully with the General Data Protection Regulation (GDPR) and Danish data protection legislation.</p>
    <p className='font-playfair font-light mb-4'><strong>Simplicity</strong> &mdash; Compliance frameworks can be complex. Our platform is designed to reduce that complexity and present information clearly and actionably.</p>

    <h2 className='font-playfair font-light text-xl mb-3 mt-8'>Contact</h2>
    <p className='font-playfair font-light mb-4'>Compliance Circle<br />Copenhagen, Denmark<br />European Union</p>
    <p className='font-playfair font-light mb-4'>For enquiries, please reach out to us at <strong>contact@compliancecircle.dk</strong></p>
  </div>
</div>
  );
}

export default AboutPage;
