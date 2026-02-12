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

const PrivacyPolicy = () =>
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

    <h1 className='font-playfair font-light text-3xl mb-4'>Lorem Ipsum</h1>

    <div className="flex items-center gap-3 justify-between">  {/* This puts them on the same line */}
      <p className="text-sm text-gray-600 whitespace-nowrap">
        Effective October 8, 2025 
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

    <p className='font-playfair font-light mb-4 italic px-16'>"Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit..."</p>

    <p className='font-playfair font-light mb-4'>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis ullamcorper lacus a odio rhoncus efficitur. Vivamus pretium sem vitae justo laoreet volutpat. Fusce eget interdum nunc. Sed elementum mauris in ligula elementum aliquet. Suspendisse potenti. Maecenas cursus nec diam non ultrices. Integer lacinia diam in ex sodales egestas. Aenean dolor urna, scelerisque sed rhoncus vel, malesuada sit amet arcu. Quisque suscipit suscipit urna sed convallis.</p>

    <p className='font-playfair font-light mb-4'>Proin iaculis odio ultricies tortor interdum, ut semper nisi porta. Nulla feugiat, enim sed consequat molestie, eros mauris egestas felis, nec lacinia arcu velit nec nisi. Praesent eu fringilla dolor. Praesent egestas cursus ullamcorper. Nullam sollicitudin orci non maximus venenatis. Proin vulputate nisi in convallis interdum. Pellentesque auctor consectetur orci, eu finibus ipsum pharetra suscipit. Aenean gravida et nibh sit amet bibendum.</p>

    <p className='font-playfair font-light mb-4'>Aliquam laoreet ligula nisi, ut vestibulum lectus interdum nec. Nulla nec elit a velit mollis convallis et vel erat. Nullam sit amet mollis enim, sed tincidunt mauris. Etiam at nulla eget nunc congue lacinia. Aliquam tellus mauris, ornare et nisl eu, sollicitudin ultricies nibh. Aliquam pellentesque cursus dignissim. Vestibulum aliquet enim a convallis dignissim. Nunc cursus et turpis elementum interdum. Nulla convallis convallis metus sit amet mattis. In quis volutpat elit. Donec ac quam tortor. Nam non nisi tempor, elementum elit sed, porttitor mi.</p>

    <p className='font-playfair font-light mb-4'>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer semper lacinia sodales. Praesent imperdiet rutrum vestibulum. Pellentesque venenatis purus et placerat euismod. Suspendisse vestibulum elit magna, in elementum massa lacinia in. Mauris magna magna, fringilla faucibus sodales vitae, ultricies feugiat leo. Nunc sit amet consequat magna, non pretium elit. Phasellus vestibulum pretium viverra. Nunc maximus nisi et interdum condimentum. Donec bibendum ornare massa sed varius. Nullam facilisis auctor justo, eget pharetra erat rutrum id.</p>

    <p className='font-playfair font-light mb-4'>Curabitur dictum nisl ut lacus varius, ut aliquet sapien fermentum. Quisque dictum imperdiet ante, et vestibulum sapien lacinia vitae. Aenean pulvinar ac urna in laoreet. Vestibulum est dolor, malesuada ac venenatis quis, pulvinar sed purus. Suspendisse potenti. Proin eget massa vel lacus elementum ullamcorper. Sed id purus eu elit commodo commodo. Aliquam vehicula aliquam viverra. Donec vitae velit purus. Etiam dignissim, libero vel blandit tincidunt, eros mi hendrerit arcu, ut blandit orci tellus quis nibh.</p>
  </div>
</div>
  );
}

export default PrivacyPolicy;