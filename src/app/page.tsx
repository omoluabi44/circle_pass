'use client';

import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';
// @ts-ignore
import { Button } from '@cred/neopop-web/lib/components';
// @ts-ignore
import { Typography } from '@cred/neopop-web/lib/components';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background-color: #0d0d0d;
    color: #ffffff;
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
`;

const Header = styled.header`
  margin-bottom: 3rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(90deg, #ff8a00, #e52e71);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  font-size: 1.25rem;
  color: #a0a0a0;
  max-width: 600px;
  line-height: 1.6;
`;

const Card = styled.div`
  background: #1a1a1a;
  border-radius: 16px;
  padding: 2.5rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export default function Home() {
  return (
    <>
      <GlobalStyle />
      <Container>
        <Header>
          <Title>NeoPOP Next.js</Title>
          <Subtitle>
            A stunning boilerplate using CRED's NeoPOP design system, Next.js App Router, and styled-components.
          </Subtitle>
        </Header>

        <Card>
          <Typography {...{ variant: "h4", color: "white" }}>
            Get Started
          </Typography>
          <Typography {...{ variant: "body2", color: "#a0a0a0" }}>
            Click the buttons below to interact with the NeoPOP components.
          </Typography>

          <Button
            variant="primary"
            kind="elevated"
            size="big"
            colorMode="dark"
            onClick={() => {
              alert("Primary Button Clicked!");
            }}
          >
            Elevated Primary
          </Button>

          <Button
            variant="secondary"
            kind="flat"
            size="big"
            colorMode="dark"
            onClick={() => {
              alert("Secondary Button Clicked!");
            }}
          >
            Flat Secondary
          </Button>
        </Card>
      </Container>
    </>
  );
}
