/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import cls from 'classnames';
import { t } from '@apache-superset/core/translation';
import { styled, useTheme } from '@apache-superset/core/theme';
import { Loading as LoaderSvg } from '../assets';
import type { LoadingProps, SizeOption } from './types';

const SIZE_MAP: Record<SizeOption, string> = {
  s: '30px',
  m: '53px',
  l: '76px',
};

const LoaderWrapper = styled.div<{
  $spinnerSize: string;
  $opacity: number;
}>`
  z-index: 99;
  width: ${({ $spinnerSize }) => $spinnerSize};
  height: ${({ $spinnerSize }) => $spinnerSize};
  opacity: ${({ $opacity }) => $opacity};
  position: relative;
  margin: 0;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  .loader {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    position: relative;
  }

  .loader::before,
  .loader::after {
    content: '';
    box-sizing: border-box;
    position: absolute;
    inset: 0;
    border-radius: 50%;
  }

  .loader::before {
    border-top: 3px solid #cba774;
    border-right: 3px solid transparent;
    animation: rotation 1s linear infinite;
  }

  .loader::after {
    inset: 3px;
    border-left: 3px solid #a88860;
    border-bottom: 3px solid transparent;
    animation: rotation 0.7s linear infinite reverse;
  }

  .preloader_logo {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38%;
    height: 38%;
    animation-name: preloader-bounce;
    animation-duration: 0.72s;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
  }

  .preloader_logo > svg,
  .preloader_logo > img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &.inline-centered {
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &.floating {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  @keyframes rotation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes preloader-bounce {
    0%,
    40%,
    60%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-26%);
    }
  }
`;
export function Loading({
  position = 'floating',
  image,
  className,
  size = 'm',
  muted = false,
}: LoadingProps) {
  const theme = useTheme();

  // Determine size from size prop
  const spinnerSize = SIZE_MAP[size];

  // Opacity - muted reduces to 0.25, otherwise full opacity
  const opacity = muted ? 0.25 : 1.0;

  // Render spinner content
  const renderSpinner = () => {
    // Precedence: explicit image prop > brandSpinnerSvg > brandSpinnerUrl > default SVG
    if (image) {
      return <img src={image} alt={`${t('Loading')}...`} />;
    }
    if (theme.brandSpinnerSvg) {
      const svgDataUri = `data:image/svg+xml;base64,${btoa(theme.brandSpinnerSvg)}`;
      return <img src={svgDataUri} alt={`${t('Loading')}...`} />;
    }
    if (theme.brandSpinnerUrl) {
      return <img src={theme.brandSpinnerUrl} alt={`${t('Loading')}...`} />;
    }
    // Default: use the imported SVG component
    return <LoaderSvg />;
  };

  return (
    <LoaderWrapper
      $spinnerSize={spinnerSize}
      $opacity={opacity}
      className={cls('loading', position, className)}
      role="status"
      aria-live="polite"
      aria-label={t('Loading')}
      data-test="loading-indicator"
    >
      <div className="loader">
        <div className="preloader_logo">{renderSpinner()}</div>
      </div>
    </LoaderWrapper>
  );
}

export type { LoadingProps };
