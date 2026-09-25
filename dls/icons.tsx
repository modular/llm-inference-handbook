import { rem } from '@mantine/core';
import { useId, type JSX } from 'react';

interface IconProps extends React.ComponentPropsWithoutRef<'svg'> {
  size?: number | string;
}

export function SunRaysIcon({
  size = 22,
  style,
  ...others
}: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: rem(size), height: rem(size), ...style }}
      {...others}
    >
      <g stroke="currentColor" strokeWidth="1.5">
        <path d="m3.5 18.5 2-2M16.5 16.5l2 2M18.5 3.5l-2 2M5.5 5.5l-2-2M11 22v-3M11 3V0M0 11h3M19 11h3M7.5 11a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z" />
      </g>
    </svg>
  );
}

export function MoonIcon({
  size = 22,
  style,
  ...others
}: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: rem(size), height: rem(size), ...style }}
      {...others}
    >
      <path
        d="M8 1a10 10 0 1 1-5.74 18.2 8.5 8.5 0 0 0 0-16.4A9.95 9.95 0 0 1 8 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function NoteIcon({
  size = 20,
  style,
  ...others
}: IconProps): JSX.Element {
  const id = useId();
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: rem(size), height: rem(size), ...style }}
      {...others}
    >
      <g clipPath={`url(#${id})`}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M18 2.5a.4.4 0 0 1-.5-.4V.8H.8v18.4h18.4V2.5h-1.3Zm-15.5 15v-15h14.6c.2 0 .4.2.4.4v14.6h-15Zm9-13v2h-2v-2h2Zm-2 5H8v-2h3.5v7h-2v-5Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id={id}>
          <path fill="currentColor" d="M0 0h20v20H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function LightbulbIcon({
  size = 20,
  style,
  ...others
}: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: rem(size), height: rem(size), ...style }}
      {...others}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.5 5.12 13.2.83H6.78L2.5 5.12v5.05l3.3 3.3v3.2H7v2.5h5.87v-2.5h1.32v-3.2l3.3-3.3V5.12ZM8.68 16.67h2.54v.83H8.68v-.83ZM4.17 5.8l3.3-3.31h5.05l3.31 3.3v3.68l-3.3 3.3V15H7.47v-2.23l-3.3-3.29V5.81Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DangerTriangleIcon({
  size = 20,
  style,
  ...others
}: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: rem(size), height: rem(size), ...style }}
      {...others}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.0019 0.278564L18.8508 17.5106H17.2387C17.1282 17.5106 17.0387 17.6002 17.0387 17.7106V19.1474H0.3125L10.0019 0.278564ZM3.04193 17.4807H16.9619L10.0019 3.9271L3.04193 17.4807ZM9.1686 12.9167V7.91671H10.8353V12.9167H9.1686ZM9.1686 16.25V14.5834H10.8353V16.25H9.1686Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CautionOctagon({
  size = 20,
  style,
  ...others
}: IconProps): JSX.Element {
  const id = useId();
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: rem(size), height: rem(size), ...style }}
      {...others}
    >
      <g clipPath={`url(#${id})`}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="m2.5 6 3.3-3.5h8.4l3.3 3.6v7.8l-3.3 3.6H5.8l-3.3-3.6V6.1ZM5.1.9H15l4.3 4.6v9.2l-4.3 4.6H5L.8 14.6V5.4L5.1.8Zm4 10v-5h1.7v5H9.2Zm0 3.4v-1.7h1.7v1.7H9.2Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id={id}>
          <path fill="currentColor" d="M0 0h20v20H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function ExperimentIcon({
  size = 20,
  style,
  ...others
}: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: rem(size), height: rem(size), ...style }}
      {...others}
    >
      <path
        d="M7.49984 1.66663h4.99996v7.5l5.8334 9.16667H1.6665l5.83334-9.16667v-7.5ZM5 1.66663h10M5.37891 12.5h9.24169"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function ThumbsUp({
  size = 20,
  style,
  ...others
}: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 20 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: rem(size), height: rem(size), ...style }}
      {...others}
    >
      <path
        d="M5 8.58v7.92M16.25 16.5H1.67V8.58H5L7.08 1.5h.75a3 3 0 0 1 3 3v2h7.5l-2.08 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function ChatBubbleIcon({
  size = 20,
  style,
  ...others
}: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: rem(size), height: rem(size), ...style }}
      {...others}
    >
      <path
        d="M2.5 3.5h15v10h-8.25L5 17v-3.5H2.5v-10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6 7h8M6 10h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
