"use client"

import React from "react";
import { motion } from "framer-motion";

export interface FeatureRowProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  reverse?: boolean;
  visualNode: React.ReactNode;
  actionNode?: React.ReactNode;
}

export function FeatureRow({ 
  title, 
  description, 
  reverse = false,
  visualNode,
  actionNode
}: FeatureRowProps) {
  return (
    <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-16 w-full`}>
      
      {/* Box de Animação/Visual */}
      <motion.div 
        initial={{ opacity: 0, x: reverse ? 50 : -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full lg:w-[55%] min-h-[500px] lg:min-h-[600px] rounded-[2.5rem] flex items-center justify-center overflow-hidden relative shadow-2xl border border-zinc-800/80 bg-gradient-to-b from-[#111111] to-[#0A0A0A]"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        {visualNode}
      </motion.div>

      {/* Box de Texto */}
      <motion.div 
        initial={{ opacity: 0, x: reverse ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className={`w-full lg:w-[45%] flex flex-col gap-6 pt-4 ${reverse ? 'lg:items-end lg:text-right' : 'lg:items-start lg:text-left'} items-start text-left`}
      >
        
      

        <h3 className="text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-tight">{title}</h3>
        <p className="text-lg lg:text-xl text-zinc-300 leading-relaxed">{description}</p>
        
        {actionNode && (
          <div className="mt-4">
            {actionNode}
          </div>
        )}
      </motion.div>
      
    </div>
  );
}
