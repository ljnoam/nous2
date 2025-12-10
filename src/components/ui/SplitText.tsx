import { motion, Variants, HTMLMotionProps } from 'framer-motion';
import { useEffect, useState, JSX } from 'react';

interface SplitTextProps extends HTMLMotionProps<"div"> {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  tag?: keyof JSX.IntrinsicElements;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  onLetterAnimationComplete?: () => void;
}

const SplitText = ({
  text,
  className = '',
  delay = 0,
  duration = 0.6,
  tag = 'p',
  textAlign = 'center',
  onLetterAnimationComplete,
  ...props
}: SplitTextProps) => {
  const [words, setWords] = useState<string[]>([]);

  useEffect(() => {
    if (text) {
      setWords(text.split(' '));
    }
  }, [text]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: delay / 1000,
      },
    },
  };

  const wordVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: duration,
        ease: [0.2, 0.65, 0.3, 0.9], // power3.out equivalent
      },
    },
  };

  const MotionTag = motion(tag as any) as any;

  return (
    <MotionTag
      className={`${className} inline-block`}
      style={{ textAlign }}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      onAnimationComplete={onLetterAnimationComplete}
      {...props}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em] will-change-transform"
          variants={wordVariants}
        >
          {word}
        </motion.span>
      ))}
    </MotionTag>
  );
};

export default SplitText;
