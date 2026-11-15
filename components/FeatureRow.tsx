"use client"

import React from "react";
import { motion } from "framer-motion";

export interface FeatureRowProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
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
    <div
      data-feature-row=""
      className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-6 lg:gap-8 w-full`}
    >
      
      {/* Box de Animação/Visual */}
      <motion.div 
        initial={{ opacity: 0, x: reverse ? 50 : -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full lg:w-[55%] min-h-[500px] lg:min-h-[600px] rounded-[2.5rem] flex items-center justify-center overflow-hidden relative m-0 p-0"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent  to-transparent" />
        {visualNode}
      </motion.div>

      {/* Box de Texto */}
      <motion.div
        data-feature-text=""
        initial={{ opacity: 0, x: reverse ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className={`w-full lg:w-[45%] flex flex-col gap-6 pt-4 ${reverse ? 'lg:items-end lg:text-right' : 'lg:items-start lg:text-left'} items-start text-left`}
      >
        
      

        <h3 className="text-4xl lg:text-5xl font-semibold tracking-tight leading-tight bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">{title}</h3>
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
