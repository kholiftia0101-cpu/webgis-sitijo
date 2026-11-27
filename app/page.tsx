            Daerah Istimewa Yogyakarta 55165
          </p>
        </div>
      </div>

      <div className="footer-contact-item">
        <span className="footer-icon">☎</span>
        <div>
          <h3>Telepon</h3>
          <p>
            <a href="tel:+62274515867">(0274) 515867</a><br />
            <a href="tel:+62274586795">(0274) 586795</a><br />
            <a href="tel:+62274515866">(0274) 515866</a>
          </p>
        </div>
      </div>

      <div className="footer-contact-item">
        <span className="footer-icon">▣</span>
        <div>
          <h3>Fax</h3>
          <p>(0274) 586795</p>
        </div>
      </div>

      <div className="footer-contact-item">
        <span className="footer-icon">✉</span>
        <div>
          <h3>Email Resmi</h3>
          <p>
            <a href="mailto:puperkim@jogjakota.go.id">
              puperkim@jogjakota.go.id
            </a>
          </p>
        </div>
      </div>

      <div className="footer-contact-item">
        <span className="footer-icon">◉</span>
        <div>
          <h3>Hotline Pengaduan</h3>
          <p>
            SMS: <a href="sms:08122780001">08122780001</a><br />
            Email: <a href="mailto:upik@jogjakota.go.id">
              upik@jogjakota.go.id
            </a>
          </p>
        </div>
      </div>
    </div>

    {/* SOSIAL MEDIA TETAP DI KIRI */}
    <div className="footer-social-section">
      <div className="footer-social-heading">
        <span>STAY CONNECTED</span>
        <h3>Ikuti Informasi DPUPKP</h3>
      </div>

      <div className="footer-social-links">
        <a href="https://www.instagram.com/dpupkpkotajogja/"
          target="_blank" rel="noopener noreferrer">
          <span>◎</span> Instagram
        </a>

        <a href="https://www.youtube.com/@dinaspupkpkotayogyakarta"
          target="_blank" rel="noopener noreferrer">
          <span>▶</span> YouTube
        </a>

        <a href="mailto:puperkim@jogjakota.go.id">
          <span>✉</span> Email
        </a>

        <a href="mailto:upik@jogjakota.go.id">
          <span>☏</span> Pengaduan UPIK
        </a>
      </div>
    </div>
  </div>

  {/* KOLOM KANAN: GOOGLE MAPS */}
  <div className="footer-map-section">
    <div className="footer-map-heading">
      <div>
        <span>LOCATION</span>
      </div>
    </div>

    <div className="footer-map">
      <iframe
        title="Lokasi Kantor DPUPKP Kota Yogyakarta"
        src="https://www.google.com/maps?q=Jl.%20Kenari%20No.%2056%2C%20Muja%20Muju%2C%20Umbulharjo%2C%20Yogyakarta&output=embed"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  </div>

  {/* COPYRIGHT FULL WIDTH */}
  <div className="footer-bottom">
    <div className="footer-copyright">
      <span className="footer-copyright-mark">S</span>
      <p>
        © {new Date().getFullYear()} Dinas Pekerjaan Umum,
        Perumahan dan Kawasan Permukiman Kota Yogyakarta.
        <br />
        <span>
          Sistem Informasi Infrastruktur Kota Yogyakarta · SITIJO
        </span>
      </p>
    </div>

    <a href="https://pu.jogjakota.go.id/"
      target="_blank" rel="noopener noreferrer"
      className="footer-official-link">
      Website Resmi DPUPKP ↗
    </a>
  </div>
</footer>


    </main>
  );
}
