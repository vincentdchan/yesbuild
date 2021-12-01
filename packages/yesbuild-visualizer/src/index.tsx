import React from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';

const Container = styled.div`
  display: flex;
  position: fixed;
	width: 100%;
	height: 100%;
  align-items: center;
`;

function App() {
  return (
    <Container>
      Hello world, Yesbuild!
    </Container>
  );
}

ReactDOM.render(
  <App />,
  document.getElementById('app'),
);
